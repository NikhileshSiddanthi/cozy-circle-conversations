-- Update the posts table media_type check constraint to include 'file'
ALTER TABLE posts DROP CONSTRAINT posts_media_type_check;

ALTER TABLE posts ADD CONSTRAINT posts_media_type_check 
CHECK (media_type = ANY (ARRAY['image'::text, 'video'::text, 'youtube'::text, 'link'::text, 'file'::text]));