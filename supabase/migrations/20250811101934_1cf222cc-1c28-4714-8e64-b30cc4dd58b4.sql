-- Update the group_members RLS policy to prevent automatic approval
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;

-- Create new policy that requires admin approval for group membership
CREATE POLICY "Users can request to join groups" 
ON public.group_members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND status = 'pending');