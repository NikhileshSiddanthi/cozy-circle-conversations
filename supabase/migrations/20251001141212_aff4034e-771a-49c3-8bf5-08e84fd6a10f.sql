-- Drop the view to avoid security definer issues
-- We'll handle ordering in application code instead
DROP VIEW IF EXISTS public.categories_with_activity;