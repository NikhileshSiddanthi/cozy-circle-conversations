-- Create storage bucket for post media files if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-files',
  'post-files',
  true,
  104857600, -- 100MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for post-files bucket
CREATE POLICY "Users can upload their own post files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'post-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view post files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'post-files');

CREATE POLICY "Users can update their own post files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'post-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own post files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'post-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_group_created ON posts(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactions_post_user ON reactions(post_id, user_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_post_user ON poll_votes(post_id, user_id);