-- Update RLS policies for groups to handle private groups properly
DROP POLICY IF EXISTS "Anyone can view approved public groups" ON public.groups;

-- Create new policies for group visibility
CREATE POLICY "Anyone can view approved public groups" 
ON public.groups 
FOR SELECT 
USING (is_approved = true AND is_public = true);

CREATE POLICY "Members can view private groups they belong to" 
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

-- Update RLS policies for posts to handle private groups
DROP POLICY IF EXISTS "Users can view posts in approved groups" ON public.posts;

CREATE POLICY "Users can view posts in public approved groups" 
ON public.posts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM groups g 
    WHERE g.id = posts.group_id 
    AND g.is_approved = true 
    AND g.is_public = true
  )
);

CREATE POLICY "Members can view posts in private groups they belong to" 
ON public.posts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM groups g 
    JOIN group_members gm ON g.id = gm.group_id
    WHERE g.id = posts.group_id 
    AND g.is_approved = true 
    AND g.is_public = false
    AND gm.user_id = auth.uid() 
    AND gm.status = 'approved'
  )
);