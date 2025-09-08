-- SQL queries to verify multi-image upload functionality
-- These queries should be run after testing to verify data integrity

-- 1. Check draft_media entries for a specific draft
-- Replace 'YOUR_DRAFT_ID' with actual draft ID from test
SELECT 
  id,
  file_id,
  url,
  status,
  order_index,
  mime_type,
  created_at
FROM draft_media 
WHERE draft_id = 'YOUR_DRAFT_ID'
ORDER BY order_index;

-- Expected: Should show 2+ rows with status='uploaded' and proper order_index (0, 1, 2, etc.)

-- 2. Check post_media entries for a published post
-- Replace 'YOUR_POST_ID' with actual post ID from test
SELECT 
  id,
  file_id,
  url,
  status,
  order_index,
  mime_type,
  created_at
FROM post_media 
WHERE post_id = 'YOUR_POST_ID'
ORDER BY order_index;

-- Expected: Should show 2+ rows with status='attached' and proper order_index

-- 3. Verify post details with media count
SELECT 
  p.id,
  p.title,
  p.content,
  p.media_type,
  COUNT(pm.id) as media_count
FROM posts p
LEFT JOIN post_media pm ON p.id = pm.post_id
WHERE p.title LIKE '%Multi-Image%' OR p.title LIKE '%Test Post%'
GROUP BY p.id, p.title, p.content, p.media_type
ORDER BY p.created_at DESC;

-- Expected: Posts with multiple images should show media_count > 1

-- 4. Check for orphaned draft_media (should be cleaned up)
SELECT COUNT(*) as orphaned_draft_media
FROM draft_media dm
WHERE NOT EXISTS (
  SELECT 1 FROM post_drafts pd 
  WHERE pd.id = dm.draft_id
);

-- Expected: Should be 0 or very low number

-- 5. Verify storage bucket files exist
SELECT 
  name,
  metadata,
  created_at
FROM storage.objects 
WHERE bucket_id = 'post-files'
AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Expected: Should show recently uploaded files