-- Allow category_id to be null for pending group suggestions
-- Admins will assign category during approval process
ALTER TABLE groups ALTER COLUMN category_id DROP NOT NULL;