-- Fix the enum conversion issue and improve database structure

-- First, create the enum types if they don't exist
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

-- Add view_count column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'view_count') THEN
    ALTER TABLE public.posts ADD COLUMN view_count integer DEFAULT 0;
  END IF;
END $$;

-- Update group_members data to use consistent values
UPDATE public.group_members SET status = 'active' WHERE status = 'approved';
UPDATE public.group_members SET status = 'pending' WHERE status NOT IN ('active', 'pending', 'blocked');
UPDATE public.group_members SET role = 'member' WHERE role NOT IN ('member', 'moderator', 'admin');

-- Now safely convert the columns to enums by adding new columns and migrating
ALTER TABLE public.group_members ADD COLUMN new_status public.member_status DEFAULT 'pending';
ALTER TABLE public.group_members ADD COLUMN new_role public.member_role DEFAULT 'member';

-- Copy data to new columns
UPDATE public.group_members SET new_status = status::public.member_status;
UPDATE public.group_members SET new_role = role::public.member_role;

-- Drop old columns and rename new ones
ALTER TABLE public.group_members DROP COLUMN status;
ALTER TABLE public.group_members DROP COLUMN role;
ALTER TABLE public.group_members RENAME COLUMN new_status TO status;
ALTER TABLE public.group_members RENAME COLUMN new_role TO role;

-- Set proper defaults and constraints
ALTER TABLE public.group_members ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.group_members ALTER COLUMN role SET DEFAULT 'member';
ALTER TABLE public.group_members ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.group_members ALTER COLUMN role SET NOT NULL;

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

-- Create storage bucket for post media if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('post-media', 'post-media', false)
ON CONFLICT (id) DO NOTHING;