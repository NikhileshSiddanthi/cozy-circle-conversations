-- ===============================================
-- MESSENGER FEATURE - DATABASE ENHANCEMENTS
-- ===============================================

-- 1. Add online status to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now();

-- 2. Create read_state table for efficient unread tracking
CREATE TABLE IF NOT EXISTS read_state (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  last_read_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, conversation_id)
);

-- 3. Add sequence numbers to messages for efficient read tracking
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS sequence_num bigint GENERATED ALWAYS AS IDENTITY;

-- 4. Add attachment fields to messages
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'file', 'video')),
ADD COLUMN IF NOT EXISTS attachment_url text,
ADD COLUMN IF NOT EXISTS attachment_name text,
ADD COLUMN IF NOT EXISTS attachment_size bigint;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_seq ON messages(conversation_id, sequence_num DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_read_state_user ON read_state(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(conversation_id, created_at DESC);

-- 6. Function to get unread count efficiently
CREATE OR REPLACE FUNCTION get_unread_count(p_user_id uuid, p_conversation_id uuid)
RETURNS bigint AS $$
  SELECT COUNT(*)
  FROM messages m
  LEFT JOIN read_state rs ON rs.user_id = p_user_id AND rs.conversation_id = p_conversation_id
  WHERE m.conversation_id = p_conversation_id
    AND m.sender_id != p_user_id
    AND (rs.last_read_at IS NULL OR m.created_at > rs.last_read_at);
$$ LANGUAGE sql STABLE;

-- 7. Function to mark conversation as read
CREATE OR REPLACE FUNCTION mark_conversation_read(p_user_id uuid, p_conversation_id uuid)
RETURNS void AS $$
  INSERT INTO read_state (user_id, conversation_id, last_read_at, updated_at)
  VALUES (p_user_id, p_conversation_id, now(), now())
  ON CONFLICT (user_id, conversation_id)
  DO UPDATE SET last_read_at = now(), updated_at = now();
$$ LANGUAGE sql;

-- 8. Enable RLS on read_state
ALTER TABLE read_state ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for read_state
CREATE POLICY "Users can view their own read state"
  ON read_state FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own read state"
  ON read_state FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own read state"
  ON read_state FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 10. Enable realtime for messages and conversations
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;

-- 11. Trigger to update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS trigger AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();