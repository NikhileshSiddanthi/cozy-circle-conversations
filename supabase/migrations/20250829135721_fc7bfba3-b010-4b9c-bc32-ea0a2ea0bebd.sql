-- Simplified database improvements for production readiness
-- Skip enum conversion, focus on essential improvements

-- Add view_count column to posts if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'view_count') THEN
    ALTER TABLE public.posts ADD COLUMN view_count integer DEFAULT 0;
  END IF;
END $$;

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

-- Create storage policies for post media
DROP POLICY IF EXISTS "authenticated_users_can_upload_media" ON storage.objects;
DROP POLICY IF EXISTS "users_can_view_their_uploads" ON storage.objects;
DROP POLICY IF EXISTS "users_can_delete_their_uploads" ON storage.objects;
DROP POLICY IF EXISTS "group_members_can_view_post_media" ON storage.objects;

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

-- Update group_member status from 'approved' to 'active' for consistency
UPDATE public.group_members SET status = 'active' WHERE status = 'approved';