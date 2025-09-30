-- Add image_url columns to categories and groups tables
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_categories_image_url ON categories(image_url) WHERE image_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_groups_image_url ON groups(image_url) WHERE image_url IS NOT NULL;