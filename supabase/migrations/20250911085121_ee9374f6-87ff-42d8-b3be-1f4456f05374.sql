-- Fix infinite recursion in group_members policies
-- First, create a security definer function to check group membership roles
CREATE OR REPLACE FUNCTION public.is_group_admin_or_moderator(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.group_members gm 
    WHERE gm.group_id = _group_id 
    AND gm.user_id = _user_id 
    AND gm.role IN ('admin', 'moderator') 
    AND gm.status = 'approved'
  );
$function$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Group admins and moderators can manage members" ON public.group_members;

-- Recreate the policy using the security definer function
CREATE POLICY "Group admins and moderators can manage members" ON public.group_members 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  is_group_admin_or_moderator(group_members.group_id, auth.uid())
);

-- Also update the posts policy to use the same function
DROP POLICY IF EXISTS "Post creators and moderators can update posts" ON public.posts;
DROP POLICY IF EXISTS "Post creators and moderators can delete posts" ON public.posts;

CREATE POLICY "Post creators and moderators can update posts" ON public.posts 
FOR UPDATE 
USING (
  auth.uid() = user_id OR
  has_role(auth.uid(), 'admin'::app_role) OR
  is_group_admin_or_moderator(posts.group_id, auth.uid())
);

CREATE POLICY "Post creators and moderators can delete posts" ON public.posts 
FOR DELETE 
USING (
  auth.uid() = user_id OR
  has_role(auth.uid(), 'admin'::app_role) OR
  is_group_admin_or_moderator(posts.group_id, auth.uid())
);

-- Update comments policies to use the same function
DROP POLICY IF EXISTS "Comment creators and moderators can update comments" ON public.comments;
DROP POLICY IF EXISTS "Comment creators and moderators can delete comments" ON public.comments;

CREATE POLICY "Comment creators and moderators can update comments" ON public.comments 
FOR UPDATE 
USING (
  auth.uid() = user_id OR
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM posts p 
    WHERE p.id = comments.post_id 
    AND is_group_admin_or_moderator(p.group_id, auth.uid())
  )
);

CREATE POLICY "Comment creators and moderators can delete comments" ON public.comments 
FOR DELETE 
USING (
  auth.uid() = user_id OR
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM posts p 
    WHERE p.id = comments.post_id 
    AND is_group_admin_or_moderator(p.group_id, auth.uid())
  )
);