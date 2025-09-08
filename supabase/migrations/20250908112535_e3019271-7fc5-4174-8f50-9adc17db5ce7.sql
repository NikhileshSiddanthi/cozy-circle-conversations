-- Add caption and alt columns to draft_media table
ALTER TABLE public.draft_media 
ADD COLUMN IF NOT EXISTS caption text,
ADD COLUMN IF NOT EXISTS alt text;

-- Add caption and alt columns to post_media table  
ALTER TABLE public.post_media
ADD COLUMN IF NOT EXISTS caption text,
ADD COLUMN IF NOT EXISTS alt text;

-- Update draft_media table to ensure order_index is properly handled
UPDATE public.draft_media 
SET order_index = 0 
WHERE order_index IS NULL;