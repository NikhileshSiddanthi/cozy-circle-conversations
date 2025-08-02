-- Update RLS policies to use 'approved' status instead of 'active'

-- Drop existing policies that reference 'active' status
DROP POLICY IF EXISTS "Group members can create posts" ON public.posts;
DROP POLICY IF EXISTS "Post creators and moderators can delete posts" ON public.posts;
DROP POLICY IF EXISTS "Post creators and moderators can update posts" ON public.posts;
DROP POLICY IF EXISTS "Group members can create comments" ON public.comments;
DROP POLICY IF EXISTS "Comment creators and moderators can delete comments" ON public.comments;
DROP POLICY IF EXISTS "Comment creators and moderators can update comments" ON public.comments;
DROP POLICY IF EXISTS "Users can vote on polls" ON public.poll_votes;

-- Recreate policies with correct 'approved' status
CREATE POLICY "Group members can create posts" 
ON public.posts 
FOR INSERT 
WITH CHECK (
  (auth.uid() = user_id) AND 
  (EXISTS (
    SELECT 1 
    FROM group_members gm
    JOIN groups g ON g.id = gm.group_id
    WHERE gm.group_id = posts.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.status = 'approved'
    AND g.is_approved = true
  ))
);

CREATE POLICY "Post creators and moderators can delete posts" 
ON public.posts 
FOR DELETE 
USING (
  (auth.uid() = user_id) OR 
  (EXISTS (
    SELECT 1 
    FROM group_members gm 
    WHERE gm.group_id = posts.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role = ANY(ARRAY['moderator', 'admin']) 
    AND gm.status = 'approved'
  )) OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Post creators and moderators can update posts" 
ON public.posts 
FOR UPDATE 
USING (
  (auth.uid() = user_id) OR 
  (EXISTS (
    SELECT 1 
    FROM group_members gm 
    WHERE gm.group_id = posts.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role = ANY(ARRAY['moderator', 'admin']) 
    AND gm.status = 'approved'
  )) OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Group members can create comments" 
ON public.comments 
FOR INSERT 
WITH CHECK (
  (auth.uid() = user_id) AND 
  (EXISTS (
    SELECT 1 
    FROM posts p
    JOIN group_members gm ON gm.group_id = p.group_id
    WHERE p.id = comments.post_id 
    AND gm.user_id = auth.uid() 
    AND gm.status = 'approved'
  ))
);

CREATE POLICY "Comment creators and moderators can delete comments" 
ON public.comments 
FOR DELETE 
USING (
  (auth.uid() = user_id) OR 
  (EXISTS (
    SELECT 1 
    FROM posts p
    JOIN group_members gm ON gm.group_id = p.group_id
    WHERE p.id = comments.post_id 
    AND gm.user_id = auth.uid() 
    AND gm.role = ANY(ARRAY['moderator', 'admin']) 
    AND gm.status = 'approved'
  )) OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Comment creators and moderators can update comments" 
ON public.comments 
FOR UPDATE 
USING (
  (auth.uid() = user_id) OR 
  (EXISTS (
    SELECT 1 
    FROM posts p
    JOIN group_members gm ON gm.group_id = p.group_id
    WHERE p.id = comments.post_id 
    AND gm.user_id = auth.uid() 
    AND gm.role = ANY(ARRAY['moderator', 'admin']) 
    AND gm.status = 'approved'
  )) OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can vote on polls" 
ON public.poll_votes 
FOR INSERT 
WITH CHECK (
  (auth.uid() = user_id) AND 
  (EXISTS (
    SELECT 1 
    FROM posts p
    JOIN group_members gm ON gm.group_id = p.group_id
    WHERE p.id = poll_votes.post_id 
    AND gm.user_id = auth.uid() 
    AND gm.status = 'approved'
    AND p.poll_question IS NOT NULL
  ))
);