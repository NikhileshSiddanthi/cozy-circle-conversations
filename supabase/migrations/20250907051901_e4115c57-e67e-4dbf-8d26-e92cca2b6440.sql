-- First, create the post_media table for proper media attachment
CREATE TABLE IF NOT EXISTS public.post_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  file_id TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  status TEXT NOT NULL DEFAULT 'attached',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on post_media
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for post_media
CREATE POLICY "Users can view post media for visible posts"
ON public.post_media FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM posts p
    JOIN groups g ON g.id = p.group_id
    WHERE p.id = post_media.post_id
    AND g.is_approved = true
    AND (
      g.is_public = true 
      OR (
        g.is_public = false 
        AND EXISTS (
          SELECT 1 FROM group_members gm 
          WHERE gm.group_id = g.id 
          AND gm.user_id = auth.uid() 
          AND gm.status = 'approved'
        )
      )
    )
  )
);

CREATE POLICY "System can manage post media during publishing"
ON public.post_media FOR ALL
USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_post_media_updated_at
BEFORE UPDATE ON public.post_media
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add edited tracking to posts and comments
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;

ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;