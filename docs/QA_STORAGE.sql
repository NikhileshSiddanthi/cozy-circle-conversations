-- QA Storage Bucket Setup
-- Run this to create the post-files bucket and its policies

-- Create the post-files bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-files', 'post-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for post-files bucket
CREATE POLICY "Anyone can view files in post-files"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-files');

CREATE POLICY "Authenticated users can upload to post-files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post-files' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'post-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'post-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
