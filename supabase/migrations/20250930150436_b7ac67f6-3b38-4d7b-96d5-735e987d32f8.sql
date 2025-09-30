-- ============================================
-- AUTH INFRASTRUCTURE TABLES
-- Facebook/Reddit-grade OAuth implementation
-- ============================================

-- 1. AUTH_IDENTITIES: Track provider-specific identities
-- Primary resolution key: (provider, provider_sub)
CREATE TABLE IF NOT EXISTS public.auth_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('google', 'apple', 'email')),
  provider_sub text NOT NULL, -- Provider's unique user ID (sub claim)
  email text,
  email_verified boolean DEFAULT false,
  raw_profile jsonb DEFAULT '{}'::jsonb, -- Store provider's full profile response
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Unique constraint: one identity per (provider, sub) pair
  CONSTRAINT auth_identities_provider_sub_unique UNIQUE (provider, provider_sub)
);

CREATE INDEX idx_auth_identities_user_id ON public.auth_identities(user_id);
CREATE INDEX idx_auth_identities_provider_sub ON public.auth_identities(provider, provider_sub);
CREATE INDEX idx_auth_identities_email ON public.auth_identities(email) WHERE email IS NOT NULL;

-- 2. SESSIONS: Track active user sessions
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  ip_address inet,
  revoked_at timestamptz,
  
  CHECK (expires_at > created_at)
);

CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON public.sessions(expires_at) WHERE revoked_at IS NULL;

-- 3. REFRESH_TOKENS: Rotating refresh tokens with replay detection
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE, -- Store hash, not plaintext
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  previous_token_id uuid REFERENCES public.refresh_tokens(id) ON DELETE SET NULL, -- Chain for rotation
  
  CHECK (expires_at > issued_at)
);

CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_session_id ON public.refresh_tokens(session_id);
CREATE INDEX idx_refresh_tokens_token_hash ON public.refresh_tokens(token_hash) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX idx_refresh_tokens_previous_id ON public.refresh_tokens(previous_token_id) WHERE previous_token_id IS NOT NULL;

-- 4. AUTH_EVENTS: Audit log for security monitoring
CREATE TABLE IF NOT EXISTS public.auth_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'SIGNUP', 'SIGNIN', 'SIGNOUT', 'LINK', 'UNLINK', 
    'REFRESH', 'TOKEN_REVOKED', 'SESSION_EXPIRED',
    'CONSENT_REVOKED', 'ERROR'
  )),
  provider text, -- 'google', 'apple', 'email', NULL
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb, -- Flexible for error details, etc.
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_auth_events_user_id ON public.auth_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_auth_events_type ON public.auth_events(event_type);
CREATE INDEX idx_auth_events_created_at ON public.auth_events(created_at DESC);

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Auto-update updated_at for auth_identities
CREATE OR REPLACE FUNCTION public.update_auth_identities_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_auth_identities_updated_at
  BEFORE UPDATE ON public.auth_identities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_auth_identities_updated_at();

-- Function to revoke all user sessions (for account deletion, security breach)
CREATE OR REPLACE FUNCTION public.revoke_all_user_sessions(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sessions
  SET revoked_at = now()
  WHERE user_id = _user_id AND revoked_at IS NULL;
  
  UPDATE public.refresh_tokens
  SET revoked_at = now()
  WHERE user_id = _user_id AND revoked_at IS NULL;
  
  INSERT INTO public.auth_events (user_id, event_type, metadata)
  VALUES (_user_id, 'SESSION_EXPIRED', jsonb_build_object('reason', 'manual_revocation'));
END;
$$;

-- Function to detect refresh token replay attacks
CREATE OR REPLACE FUNCTION public.check_refresh_token_replay(
  _token_hash text,
  _user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_record RECORD;
BEGIN
  -- Find the token
  SELECT * INTO v_token_record
  FROM public.refresh_tokens
  WHERE token_hash = _token_hash;
  
  -- Token doesn't exist
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Token was already used (replay attack!)
  IF v_token_record.revoked_at IS NOT NULL THEN
    -- Revoke entire session chain
    PERFORM public.revoke_all_user_sessions(v_token_record.user_id);
    
    INSERT INTO public.auth_events (user_id, event_type, provider, metadata)
    VALUES (
      v_token_record.user_id,
      'ERROR',
      NULL,
      jsonb_build_object(
        'error', 'refresh_token_replay',
        'token_id', v_token_record.id,
        'session_id', v_token_record.session_id
      )
    );
    
    RETURN false;
  END IF;
  
  -- Token expired
  IF v_token_record.expires_at < now() THEN
    UPDATE public.refresh_tokens
    SET revoked_at = now()
    WHERE id = v_token_record.id;
    
    RETURN false;
  END IF;
  
  -- Wrong user
  IF v_token_record.user_id != _user_id THEN
    RETURN false;
  END IF;
  
  -- Valid token
  RETURN true;
END;
$$;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.auth_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;

-- AUTH_IDENTITIES: Users can view their own, admins can view all
CREATE POLICY "Users can view their own identities"
  ON public.auth_identities
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all identities"
  ON public.auth_identities
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage identities"
  ON public.auth_identities
  FOR ALL
  USING (auth.role() = 'service_role');

-- SESSIONS: Users can view their own
CREATE POLICY "Users can view their own sessions"
  ON public.sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can revoke their own sessions"
  ON public.sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can manage sessions"
  ON public.sessions
  FOR ALL
  USING (auth.role() = 'service_role');

-- REFRESH_TOKENS: No direct user access
CREATE POLICY "System can manage refresh tokens"
  ON public.refresh_tokens
  FOR ALL
  USING (auth.role() = 'service_role');

-- AUTH_EVENTS: Users can view their own, admins can view all
CREATE POLICY "Users can view their own events"
  ON public.auth_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all events"
  ON public.auth_events
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can create events"
  ON public.auth_events
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- COMMENTS & DOCUMENTATION
-- ============================================

COMMENT ON TABLE public.auth_identities IS 'Provider-specific identities (Google, Apple, etc). Primary key: (provider, provider_sub). Email can change, but sub is immutable per provider.';
COMMENT ON TABLE public.sessions IS 'Active user sessions with expiration and revocation tracking.';
COMMENT ON TABLE public.refresh_tokens IS 'Rotating refresh tokens with replay detection via token chaining.';
COMMENT ON TABLE public.auth_events IS 'Audit log for authentication events, errors, and security monitoring.';

COMMENT ON FUNCTION public.revoke_all_user_sessions IS 'Revokes all sessions and refresh tokens for a user. Used on account deletion or security breach.';
COMMENT ON FUNCTION public.check_refresh_token_replay IS 'Validates refresh token and detects replay attacks. Returns false and revokes session chain on replay.';
