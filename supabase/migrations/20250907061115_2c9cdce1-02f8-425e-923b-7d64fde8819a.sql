-- Step 2: Add missing columns and indexes (safe, idempotent)
ALTER TABLE draft_media 
  ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_draft_media_draft_id ON draft_media(draft_id);
CREATE INDEX IF NOT EXISTS idx_draft_media_order ON draft_media(draft_id, order_index);