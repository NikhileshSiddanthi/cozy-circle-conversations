-- Step 5: Add FK constraint and set NOT NULL (safe since pre-checks passed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'draft_media_draft_id_fkey'
  ) THEN
    ALTER TABLE draft_media
      ADD CONSTRAINT draft_media_draft_id_fkey
      FOREIGN KEY (draft_id) REFERENCES post_drafts(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Set NOT NULL since we confirmed zero nulls
ALTER TABLE draft_media ALTER COLUMN draft_id SET NOT NULL;