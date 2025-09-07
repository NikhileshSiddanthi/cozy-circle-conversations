-- Fix post_media table by adding columns properly
-- First add nullable user_id column
ALTER TABLE post_media 
ADD COLUMN IF NOT EXISTS user_id uuid,
ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Update existing rows to have a user_id (use post creator's user_id)
UPDATE post_media 
SET user_id = posts.user_id 
FROM posts 
WHERE post_media.post_id = posts.id 
AND post_media.user_id IS NULL;

-- Now make user_id NOT NULL
ALTER TABLE post_media 
ALTER COLUMN user_id SET NOT NULL;

-- Add foreign key constraint if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'post_media_post_id_fkey'
  ) THEN
    ALTER TABLE post_media
      ADD CONSTRAINT post_media_post_id_fkey
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_post_media_order ON post_media(post_id, order_index);
CREATE INDEX IF NOT EXISTS idx_draft_media_draft_id ON draft_media(draft_id);

-- Add metadata column to posts to track draft_id for idempotency
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;