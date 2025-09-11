-- Add missing view_count column to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_posts_view_count ON public.posts(view_count);