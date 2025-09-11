-- Update group membership policies to allow direct joining
DROP POLICY IF EXISTS "Users can request to join groups" ON public.group_members;

-- Allow users to directly join groups with approved status
CREATE POLICY "Users can directly join groups" 
ON public.group_members 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  status = 'approved'::text AND
  EXISTS (
    SELECT 1 FROM groups 
    WHERE groups.id = group_id AND groups.is_approved = true
  )
);

-- Update group member management policies for group admins/moderators
CREATE POLICY "Group admins and moderators can manage members" 
ON public.group_members 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  EXISTS (
    SELECT 1 FROM group_members gm 
    WHERE gm.group_id = group_members.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role IN ('admin', 'moderator') 
    AND gm.status = 'approved'
  )
);

-- Update post creation policy to allow any authenticated user to post in approved groups
DROP POLICY IF EXISTS "Group members can create posts" ON public.posts;

CREATE POLICY "Users can create posts in approved groups" 
ON public.posts 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM groups g 
    WHERE g.id = group_id AND g.is_approved = true
  )
);

-- Update comment creation policy to allow any authenticated user to comment
DROP POLICY IF EXISTS "Group members can create comments" ON public.comments;

CREATE POLICY "Users can create comments on visible posts" 
ON public.comments 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM posts p 
    JOIN groups g ON g.id = p.group_id 
    WHERE p.id = post_id AND g.is_approved = true
  )
);

-- Update poll voting policy 
DROP POLICY IF EXISTS "Users can vote on polls" ON public.poll_votes;

CREATE POLICY "Users can vote on polls in approved groups" 
ON public.poll_votes 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM posts p 
    JOIN groups g ON g.id = p.group_id 
    WHERE p.id = post_id 
    AND g.is_approved = true 
    AND p.poll_question IS NOT NULL
  )
);