-- Step 3: Populate order_index sensibly for existing rows
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY draft_id ORDER BY created_at ASC) - 1 AS rn
  FROM draft_media
  WHERE draft_id IS NOT NULL
)
UPDATE draft_media dm
SET order_index = r.rn
FROM ranked r
WHERE dm.id = r.id
  AND (dm.order_index IS NULL OR dm.order_index <> r.rn);