-- Clean database structure upgrade with proper constraint handling

-- Drop all existing check constraints that might conflict
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all check constraints on group_members table
    FOR r IN (SELECT constraint_name FROM information_schema.table_constraints 
              WHERE table_name = 'group_members' AND constraint_type = 'CHECK')
    LOOP
        EXECUTE 'ALTER TABLE public.group_members DROP CONSTRAINT IF EXISTS ' || r.constraint_name;
    END LOOP;
END $$;

-- Create enum types if they don't exist
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

-- Add view_count column to posts if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'view_count') THEN
    ALTER TABLE public.posts ADD COLUMN view_count integer DEFAULT 0;
  END IF;
END $$;

-- Clean up group_members data first
UPDATE public.group_members 
SET status = 'active' 
WHERE status IN ('approved', 'accepted');

UPDATE public.group_members 
SET status = 'pending' 
WHERE status NOT IN ('active', 'pending', 'blocked');

UPDATE public.group_members 
SET role = 'member' 
WHERE role NOT IN ('member', 'moderator', 'admin');

-- Now safely recreate the table structure for group_members
-- First backup the data
CREATE TEMPORARY TABLE temp_group_members AS 
SELECT id, group_id, user_id, joined_at,
       status::text as old_status,
       role::text as old_role
FROM public.group_members;

-- Drop and recreate the table with proper types
DROP TABLE public.group_members CASCADE;

CREATE TABLE public.group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.member_status NOT NULL DEFAULT 'pending',
  role public.member_role NOT NULL DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Restore the data with proper enum values
INSERT INTO public.group_members (id, group_id, user_id, status, role, joined_at)
SELECT id, group_id, user_id, 
       CASE 
         WHEN old_status = 'active' THEN 'active'::public.member_status
         WHEN old_status = 'blocked' THEN 'blocked'::public.member_status
         ELSE 'pending'::public.member_status
       END,
       CASE 
         WHEN old_role = 'moderator' THEN 'moderator'::public.member_role
         WHEN old_role = 'admin' THEN 'admin'::public.member_role
         ELSE 'member'::public.member_role
       END,
       joined_at
FROM temp_group_members;

-- Enable RLS on the recreated table
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Create essential performance indexes
CREATE INDEX IF NOT EXISTS idx_posts_group_id_created_at ON public.posts(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_pinned ON public.posts(group_id) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_comments_post_id_created_at ON public.comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_group_members_user_group ON public.group_members(user_id, group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_status ON public.group_members(status);
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON public.reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_comment_id ON public.reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON public.news_articles(published_at DESC);

-- Create storage bucket for media uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('post-media', 'post-media', false)
ON CONFLICT (id) DO NOTHING;