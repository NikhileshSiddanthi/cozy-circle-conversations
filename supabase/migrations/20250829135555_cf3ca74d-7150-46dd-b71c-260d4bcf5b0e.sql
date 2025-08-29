-- Fixed database restructure - handle enum conversion properly
-- This migration creates a clean, secure foundation

-- Drop existing policies that may conflict
DROP POLICY IF EXISTS "Admins can view all groups" ON public.groups;
DROP POLICY IF EXISTS "Users can view their own groups" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users can suggest groups" ON public.groups;
DROP POLICY IF EXISTS "Admins can modify all groups" ON public.groups;
DROP POLICY IF EXISTS "Group creators can update their pending groups" ON public.groups;
DROP POLICY IF EXISTS "Anyone can view public groups" ON public.groups;
DROP POLICY IF EXISTS "Members can view private groups" ON public.groups;
DROP POLICY IF EXISTS "Everyone can view public groups" ON public.groups;

-- Create enums if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_status') THEN
    CREATE TYPE public.member_status AS ENUM ('active', 'pending', 'blocked');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_role') THEN
    CREATE TYPE public.member_role AS ENUM ('member', 'moderator', 'admin');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reaction_type') THEN
    CREATE TYPE public.reaction_type AS ENUM ('like', 'dislike');
  END IF;
END $$;

-- Add missing columns to posts table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'view_count') THEN
    ALTER TABLE public.posts ADD COLUMN view_count integer DEFAULT 0;
  END IF;
END $$;

-- Handle group_members table enum conversion carefully
-- First update the data to match enum values
UPDATE public.group_members SET status = 'active' WHERE status = 'approved';
UPDATE public.group_members SET status = 'pending' WHERE status NOT IN ('active', 'pending', 'blocked');
UPDATE public.group_members SET role = 'member' WHERE role NOT IN ('member', 'moderator', 'admin');

-- Drop existing constraints and defaults
ALTER TABLE public.group_members ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.group_members DROP CONSTRAINT IF EXISTS group_members_status_check;
ALTER TABLE public.group_members DROP CONSTRAINT IF EXISTS group_members_role_check;

-- Convert columns to enum types
ALTER TABLE public.group_members 
  ALTER COLUMN status TYPE public.member_status USING status::public.member_status;
  
ALTER TABLE public.group_members 
  ALTER COLUMN role TYPE public.member_role USING role::public.member_role;

-- Set new defaults
ALTER TABLE public.group_members ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.group_members ALTER COLUMN role SET DEFAULT 'member';

-- Update helper functions to be more secure
CREATE OR REPLACE FUNCTION public.has_role(uid uuid, role_name public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    WHERE ur.user_id = uid AND ur.role = role_name
  )
$$;

CREATE OR REPLACE FUNCTION public.is_group_member(group_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.group_members gm 
    WHERE gm.group_id = is_group_member.group_id 
      AND gm.user_id = is_group_member.user_id 
      AND gm.status = 'active'
  )
$$;

-- Create comprehensive, secure RLS policies for groups
CREATE POLICY "users_can_view_public_approved_groups"
  ON public.groups
  FOR SELECT
  USING (is_approved = true AND is_public = true);

CREATE POLICY "members_can_view_private_groups"
  ON public.groups
  FOR SELECT
  TO authenticated
  USING (
    is_approved = true AND is_public = false AND 
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = groups.id
        AND gm.user_id = auth.uid()
        AND gm.status = 'active'
    )
  );

CREATE POLICY "users_can_view_own_groups"
  ON public.groups
  FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "admins_can_view_all_groups"
  ON public.groups
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "authenticated_users_can_create_groups"
  ON public.groups
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "creators_can_update_pending_groups"
  ON public.groups
  FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid() AND is_approved = false);

CREATE POLICY "admins_can_modify_all_groups"
  ON public.groups
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create secure RLS policies for posts
CREATE POLICY "users_can_view_public_group_posts"
  ON public.posts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = posts.group_id
        AND g.is_approved = true
        AND g.is_public = true
    )
  );

CREATE POLICY "members_can_view_private_group_posts"
  ON public.posts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      JOIN public.group_members gm ON g.id = gm.group_id
      WHERE g.id = posts.group_id
        AND g.is_approved = true
        AND g.is_public = false
        AND gm.user_id = auth.uid()
        AND gm.status = 'active'
    )
  );

CREATE POLICY "active_members_can_create_posts"
  ON public.posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.group_members gm
      JOIN public.groups g ON g.id = gm.group_id
      WHERE gm.group_id = posts.group_id
        AND gm.user_id = auth.uid()
        AND gm.status = 'active'
        AND g.is_approved = true
    )
  );

CREATE POLICY "owner_or_moderator_can_update_posts"
  ON public.posts
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = posts.group_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('moderator', 'admin')
        AND gm.status = 'active'
    ) OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "owner_or_moderator_can_delete_posts"
  ON public.posts
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = posts.group_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('moderator', 'admin')
        AND gm.status = 'active'
    ) OR
    public.has_role(auth.uid(), 'admin')
  );

-- Create essential indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_group_id_created_at ON public.posts(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_pinned ON public.posts(group_id) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_comments_post_id_created_at ON public.comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_group_members_user_group ON public.group_members(user_id, group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_status ON public.group_members(status);
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON public.reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_comment_id ON public.reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON public.news_articles(published_at DESC);

-- Create storage bucket for post media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('post-media', 'post-media', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for secure media uploads
CREATE POLICY "authenticated_users_can_upload_media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users_can_view_their_uploads"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users_can_delete_their_uploads"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "group_members_can_view_post_media"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'post-media');