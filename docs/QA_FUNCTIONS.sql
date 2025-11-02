-- QA Database Functions
-- Run this AFTER RLS policies but BEFORE triggers

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to update auth_identities updated_at
CREATE OR REPLACE FUNCTION public.update_auth_identities_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to handle new user creation (profile + role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Insert into profiles table with proper display_name fallback
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id, 
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      INITCAP(REPLACE(SPLIT_PART(NEW.email, '@', 1), '.', ' ')),
      'User'
    )
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Function to update group member count
CREATE OR REPLACE FUNCTION public.update_group_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update member count when a new member is added with approved status
    IF NEW.status = 'approved' THEN
      UPDATE public.groups 
      SET member_count = (
        SELECT COUNT(*) 
        FROM public.group_members 
        WHERE group_id = NEW.group_id AND status = 'approved'
      )
      WHERE id = NEW.group_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update member count when status changes
    IF OLD.status != NEW.status THEN
      UPDATE public.groups 
      SET member_count = (
        SELECT COUNT(*) 
        FROM public.group_members 
        WHERE group_id = NEW.group_id AND status = 'approved'
      )
      WHERE id = NEW.group_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update member count when a member is removed
    UPDATE public.groups 
    SET member_count = (
      SELECT COUNT(*) 
      FROM public.group_members 
      WHERE group_id = OLD.group_id AND status = 'approved'
    )
    WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Function to update post counts (likes/dislikes)
CREATE OR REPLACE FUNCTION public.update_post_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.post_id IS NOT NULL THEN
      -- Update like/dislike counts for posts
      UPDATE public.posts 
      SET 
        like_count = (SELECT COUNT(*) FROM public.reactions WHERE post_id = NEW.post_id AND reaction_type = 'like'),
        dislike_count = (SELECT COUNT(*) FROM public.reactions WHERE post_id = NEW.post_id AND reaction_type = 'dislike')
      WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.post_id IS NOT NULL THEN
      -- Update like/dislike counts for posts
      UPDATE public.posts 
      SET 
        like_count = (SELECT COUNT(*) FROM public.reactions WHERE post_id = OLD.post_id AND reaction_type = 'like'),
        dislike_count = (SELECT COUNT(*) FROM public.reactions WHERE post_id = OLD.post_id AND reaction_type = 'dislike')
      WHERE id = OLD.post_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Function to update comment counts
CREATE OR REPLACE FUNCTION public.update_comment_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- For comments table operations (post_id will be set)
    IF TG_TABLE_NAME = 'comments' THEN
      -- Update comment count for posts
      UPDATE public.posts 
      SET comment_count = (SELECT COUNT(*) FROM public.comments WHERE post_id = NEW.post_id)
      WHERE id = NEW.post_id;
      RETURN NEW;
    END IF;
    
    -- For reactions table operations (both post_id and comment_id might be set)
    IF TG_TABLE_NAME = 'reactions' THEN
      -- Update comment count for posts if this is a comment reaction
      IF NEW.post_id IS NOT NULL THEN
        UPDATE public.posts 
        SET comment_count = (SELECT COUNT(*) FROM public.comments WHERE post_id = NEW.post_id)
        WHERE id = NEW.post_id;
      END IF;
      
      -- Update like/dislike counts for comments if this is a comment reaction
      IF NEW.comment_id IS NOT NULL THEN
        UPDATE public.comments 
        SET 
          like_count = (SELECT COUNT(*) FROM public.reactions WHERE comment_id = NEW.comment_id AND reaction_type = 'like'),
          dislike_count = (SELECT COUNT(*) FROM public.reactions WHERE comment_id = NEW.comment_id AND reaction_type = 'dislike')
        WHERE id = NEW.comment_id;
      END IF;
      RETURN NEW;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- For comments table operations
    IF TG_TABLE_NAME = 'comments' THEN
      -- Update comment count for posts
      UPDATE public.posts 
      SET comment_count = (SELECT COUNT(*) FROM public.comments WHERE post_id = OLD.post_id)
      WHERE id = OLD.post_id;
      RETURN OLD;
    END IF;
    
    -- For reactions table operations
    IF TG_TABLE_NAME = 'reactions' THEN
      -- Update comment count for posts if this was a comment reaction
      IF OLD.post_id IS NOT NULL THEN
        UPDATE public.posts 
        SET comment_count = (SELECT COUNT(*) FROM public.comments WHERE post_id = OLD.post_id)
        WHERE id = OLD.post_id;
      END IF;
      
      -- Update like/dislike counts for comments if this was a comment reaction
      IF OLD.comment_id IS NOT NULL THEN
        UPDATE public.comments 
        SET 
          like_count = (SELECT COUNT(*) FROM public.reactions WHERE comment_id = OLD.comment_id AND reaction_type = 'like'),
          dislike_count = (SELECT COUNT(*) FROM public.reactions WHERE comment_id = OLD.comment_id AND reaction_type = 'dislike')
        WHERE id = OLD.comment_id;
      END IF;
      RETURN OLD;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Function to update conversation last message timestamp
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- Function to increment visitor count
CREATE OR REPLACE FUNCTION public.increment_visitor_count()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE visitor_stats 
  SET 
    total_visits = total_visits + 1,
    updated_at = now()
  WHERE id = (SELECT id FROM visitor_stats LIMIT 1);
END;
$$;

-- Function to revoke all user sessions
CREATE OR REPLACE FUNCTION public.revoke_all_user_sessions(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Function to check refresh token replay
CREATE OR REPLACE FUNCTION public.check_refresh_token_replay(_token_hash text, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Function to cleanup posts by user
CREATE OR REPLACE FUNCTION public.cleanup_posts_by_user(_user_id uuid)
RETURNS TABLE(deleted_posts integer, deleted_comments integer, deleted_reactions integer, deleted_post_media integer, deleted_drafts integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  posts_count integer := 0;
  comments_count integer := 0;
  reactions_count integer := 0;
  media_count integer := 0;
  drafts_count integer := 0;
BEGIN
  -- Count and delete reactions for posts by this user
  SELECT COUNT(*) INTO reactions_count
  FROM reactions r
  WHERE r.post_id IN (SELECT id FROM posts WHERE user_id = _user_id)
     OR r.comment_id IN (SELECT c.id FROM comments c 
                         JOIN posts p ON c.post_id = p.id 
                         WHERE p.user_id = _user_id);
  
  DELETE FROM reactions r
  WHERE r.post_id IN (SELECT id FROM posts WHERE user_id = _user_id)
     OR r.comment_id IN (SELECT c.id FROM comments c 
                         JOIN posts p ON c.post_id = p.id 
                         WHERE p.user_id = _user_id);

  -- Count and delete comments on posts by this user
  SELECT COUNT(*) INTO comments_count
  FROM comments c
  JOIN posts p ON c.post_id = p.id
  WHERE p.user_id = _user_id;
  
  DELETE FROM comments c
  USING posts p
  WHERE c.post_id = p.id AND p.user_id = _user_id;

  -- Count and delete post media
  SELECT COUNT(*) INTO media_count
  FROM post_media pm
  WHERE pm.post_id IN (SELECT id FROM posts WHERE user_id = _user_id);
  
  DELETE FROM post_media pm
  WHERE pm.post_id IN (SELECT id FROM posts WHERE user_id = _user_id);

  -- Count and delete posts
  SELECT COUNT(*) INTO posts_count
  FROM posts WHERE user_id = _user_id;
  
  DELETE FROM posts WHERE user_id = _user_id;

  -- Count and delete drafts and draft media
  SELECT COUNT(*) INTO drafts_count
  FROM post_drafts WHERE user_id = _user_id;
  
  DELETE FROM draft_media WHERE user_id = _user_id;
  DELETE FROM post_drafts WHERE user_id = _user_id;

  RETURN QUERY SELECT posts_count, comments_count, reactions_count, media_count, drafts_count;
END;
$$;
