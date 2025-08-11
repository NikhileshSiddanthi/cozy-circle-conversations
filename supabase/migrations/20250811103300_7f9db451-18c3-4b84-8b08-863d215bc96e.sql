-- Fix RLS policies to ensure anyone can view public groups
-- First, let's see what policies currently exist and then update them

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Anyone can view approved public groups" ON public.groups;
DROP POLICY IF EXISTS "Members can view private groups they belong to" ON public.groups;

-- Create a comprehensive policy for viewing groups
CREATE POLICY "Anyone can view public groups" 
ON public.groups 
FOR SELECT 
USING (is_approved = true AND is_public = true);

-- Members can view private groups they belong to
CREATE POLICY "Members can view private groups" 
ON public.groups 
FOR SELECT 
USING (
  is_approved = true 
  AND is_public = false 
  AND EXISTS (
    SELECT 1 FROM group_members gm 
    WHERE gm.group_id = groups.id 
    AND gm.user_id = auth.uid() 
    AND gm.status = 'approved'
  )
);

-- Also ensure that unauthenticated users can see public groups
CREATE POLICY "Public can view public groups" 
ON public.groups 
FOR SELECT 
USING (is_approved = true AND is_public = true);