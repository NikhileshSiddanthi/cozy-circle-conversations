-- Fix infinite recursion in conversation_participants RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can leave conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update their participation" ON conversation_participants;

-- Create security definer function to check conversation membership
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.conversation_participants 
    WHERE conversation_id = _conversation_id 
    AND user_id = _user_id
  );
$$;

-- Recreate policies using the security definer function
CREATE POLICY "Users can view participants in their conversations"
ON conversation_participants
FOR SELECT
USING (is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can join conversations"
ON conversation_participants
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave conversations"
ON conversation_participants
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their participation"
ON conversation_participants
FOR UPDATE
USING (auth.uid() = user_id);

-- Fix conversations RLS to use the security definer function
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;

CREATE POLICY "Users can view conversations they participate in"
ON conversations
FOR SELECT
USING (is_conversation_participant(id, auth.uid()));

-- Fix messages RLS to use the security definer function
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;

CREATE POLICY "Users can view messages in their conversations"
ON messages
FOR SELECT
USING (is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can send messages to their conversations"
ON messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id 
  AND is_conversation_participant(conversation_id, auth.uid())
);