-- Fix infinite recursion in groups RLS policies
-- Create security definer function to check group membership
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.group_members gm 
    WHERE gm.group_id = _group_id 
    AND gm.user_id = _user_id 
    AND gm.status = 'approved'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop the problematic policies
DROP POLICY IF EXISTS "Members can view private groups" ON public.groups;
DROP POLICY IF EXISTS "Public can view public groups" ON public.groups;

-- Recreate the policy using the security definer function
CREATE POLICY "Members can view private groups" 
ON public.groups 
FOR SELECT 
USING (
  is_approved = true 
  AND is_public = false 
  AND public.is_group_member(id, auth.uid())
);

-- Create a single policy for public groups (removing duplicate)
CREATE POLICY "Everyone can view public groups" 
ON public.groups 
FOR SELECT 
USING (is_approved = true AND is_public = true);