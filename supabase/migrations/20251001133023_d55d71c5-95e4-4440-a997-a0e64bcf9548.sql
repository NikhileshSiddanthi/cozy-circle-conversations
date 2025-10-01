-- Make category description optional and clear existing descriptions
ALTER TABLE public.categories 
ALTER COLUMN description DROP NOT NULL;

-- Clear all existing category descriptions
UPDATE public.categories 
SET description = NULL;

-- Add comment explaining the change
COMMENT ON COLUMN public.categories.description IS 'Optional category description - kept for future use but not displayed';

-- Create a view to get categories ordered by latest post activity
CREATE OR REPLACE VIEW public.categories_with_activity AS
SELECT 
  c.*,
  COUNT(DISTINCT g.id) as group_count,
  MAX(p.created_at) as latest_post_at
FROM public.categories c
LEFT JOIN public.groups g ON g.category_id = c.id AND g.is_approved = true
LEFT JOIN public.posts p ON p.group_id = g.id
GROUP BY c.id
ORDER BY latest_post_at DESC NULLS LAST, c.created_at DESC;