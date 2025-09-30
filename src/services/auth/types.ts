/**
 * Production-grade OAuth Types
 * Facebook/Reddit-level authentication system
 */

export type OAuthProvider = 'google' | 'apple' | 'email';

export interface AuthIdentity {
  id: string;
  user_id: string;
  provider: OAuthProvider;
  provider_sub: string;
  email: string | null;
  email_verified: boolean;
  raw_profile: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  last_activity_at: string;
  user_agent: string | null;
  ip_address: string | null;
  revoked_at: string | null;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  session_id: string;
  token_hash: string;
  issued_at: string;
  expires_at: string;
  revoked_at: string | null;
  previous_token_id: string | null;
}

export interface AuthEvent {
  id: string;
  user_id: string | null;
  event_type: 'SIGNUP' | 'SIGNIN' | 'SIGNOUT' | 'LINK' | 'UNLINK' | 
               'REFRESH' | 'TOKEN_REVOKED' | 'SESSION_EXPIRED' | 
               'CONSENT_REVOKED' | 'ERROR';
  provider: OAuthProvider | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface OAuthCallbackParams {
  code: string;
  state: string;
  provider: OAuthProvider;
}

export interface OAuthState {
  nonce: string;
  redirectTo?: string;
  linkMode?: boolean;
  timestamp: number;
}

export interface TokenValidationResult {
  valid: boolean;
  userId?: string;
  error?: string;
  requiresReAuth?: boolean;
}

export interface AccountLinkingRequest {
  provider: OAuthProvider;
  requireRecentAuth: boolean;
  otpEmail?: string;
}

export interface UsernameValidation {
  valid: boolean;
  suggestion?: string;
  error?: string;
}
