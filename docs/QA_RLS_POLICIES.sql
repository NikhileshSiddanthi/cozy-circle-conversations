-- QA RLS Policies and Functions
-- Run this AFTER the schema import

-- Step 1: Create helper functions for RLS policies
CREATE OR REPLACE FUNCTION has_role(user_id uuid, required_role app_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = $1 AND user_roles.role = $2
  );
$$;

CREATE OR REPLACE FUNCTION is_group_member(group_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = $1 
      AND group_members.user_id = $2 
      AND group_members.status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION is_group_admin_or_moderator(group_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = $1 
      AND group_members.user_id = $2 
      AND group_members.role IN ('admin', 'moderator')
      AND group_members.status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION is_conversation_participant(conversation_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = $1 
      AND conversation_participants.user_id = $2
  );
$$;

-- Step 2: Enable RLS on all tables
ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_previews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_stats ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies for each table

-- auth_events policies
CREATE POLICY "Users can view their own events" ON auth_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all events" ON auth_events FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "System can create events" ON auth_events FOR INSERT WITH CHECK (true);

-- auth_identities policies
CREATE POLICY "Users can view their own identities" ON auth_identities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all identities" ON auth_identities FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "System can manage identities" ON auth_identities FOR ALL USING (auth.role() = 'service_role');

-- categories policies
CREATE POLICY "Anyone can view categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Only admins can modify categories" ON categories FOR ALL USING (has_role(auth.uid(), 'admin'));

-- comments policies
CREATE POLICY "Users can view comments on visible posts" ON comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM posts p JOIN groups g ON g.id = p.group_id
    WHERE p.id = comments.post_id AND g.is_approved = true
  )
);
CREATE POLICY "Users can create comments on visible posts" ON comments FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM posts p JOIN groups g ON g.id = p.group_id
    WHERE p.id = comments.post_id AND g.is_approved = true
  )
);
CREATE POLICY "Comment creators and moderators can update comments" ON comments FOR UPDATE USING (
  auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR 
  EXISTS (SELECT 1 FROM posts p WHERE p.id = comments.post_id AND is_group_admin_or_moderator(p.group_id, auth.uid()))
);
CREATE POLICY "Comment creators and moderators can delete comments" ON comments FOR DELETE USING (
  auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR 
  EXISTS (SELECT 1 FROM posts p WHERE p.id = comments.post_id AND is_group_admin_or_moderator(p.group_id, auth.uid()))
);

-- connections policies
CREATE POLICY "Users can view their own connections" ON connections FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can create connection requests" ON connections FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update their own connections" ON connections FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can delete their own connections" ON connections FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- conversation_participants policies
CREATE POLICY "Users can view participants in their conversations" ON conversation_participants FOR SELECT USING (is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "Users can join conversations" ON conversation_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their participation" ON conversation_participants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can leave conversations" ON conversation_participants FOR DELETE USING (auth.uid() = user_id);

-- conversations policies
CREATE POLICY "Users can view conversations they participate in" ON conversations FOR SELECT USING (is_conversation_participant(id, auth.uid()));
CREATE POLICY "Users can create conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Conversation creators can update conversations" ON conversations FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "System can update conversations" ON conversations FOR UPDATE USING (true) WITH CHECK (true);

-- draft_media policies
CREATE POLICY "Users can manage their own draft media" ON draft_media FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all draft media" ON draft_media FOR ALL USING (has_role(auth.uid(), 'admin'));

-- group_members policies
CREATE POLICY "Users can view group members for approved groups" ON group_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM groups WHERE groups.id = group_members.group_id AND groups.is_approved = true)
);
CREATE POLICY "Users can directly join groups" ON group_members FOR INSERT WITH CHECK (
  auth.uid() = user_id AND status = 'approved' AND 
  EXISTS (SELECT 1 FROM groups WHERE groups.id = group_members.group_id AND groups.is_approved = true)
);
CREATE POLICY "Group admins and moderators can manage members" ON group_members FOR ALL USING (
  has_role(auth.uid(), 'admin') OR is_group_admin_or_moderator(group_id, auth.uid())
);
CREATE POLICY "Admins can manage all group members" ON group_members FOR ALL USING (has_role(auth.uid(), 'admin'));

-- groups policies
CREATE POLICY "Anyone can view public groups" ON groups FOR SELECT USING (is_approved = true AND is_public = true);
CREATE POLICY "Everyone can view public groups" ON groups FOR SELECT USING (is_approved = true AND is_public = true);
CREATE POLICY "Members can view private groups" ON groups FOR SELECT USING (is_approved = true AND is_public = false AND is_group_member(id, auth.uid()));
CREATE POLICY "Users can view their own groups" ON groups FOR SELECT USING (creator_id = auth.uid());
CREATE POLICY "Admins can view all groups" ON groups FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can suggest groups" ON groups FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Group creators can update their pending groups" ON groups FOR UPDATE USING (creator_id = auth.uid() AND is_approved = false);
CREATE POLICY "Admins can modify all groups" ON groups FOR ALL USING (has_role(auth.uid(), 'admin'));

-- link_previews policies
CREATE POLICY "Anyone can view link previews" ON link_previews FOR SELECT USING (true);
CREATE POLICY "Link previews are publicly readable" ON link_previews FOR SELECT USING (true);
CREATE POLICY "System can manage link previews" ON link_previews FOR ALL USING (true);
CREATE POLICY "Service role can manage link previews" ON link_previews FOR ALL USING (auth.role() = 'service_role');

-- messages policies
CREATE POLICY "Users can view messages in their conversations" ON messages FOR SELECT USING (is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "Users can send messages to their conversations" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id AND is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "Users can update their own messages" ON messages FOR UPDATE USING (auth.uid() = sender_id);
CREATE POLICY "Users can delete their own messages" ON messages FOR DELETE USING (auth.uid() = sender_id);

-- news_articles policies
CREATE POLICY "Anyone can view news articles from verified sources" ON news_articles FOR SELECT USING (
  EXISTS (SELECT 1 FROM news_sources WHERE news_sources.id = news_articles.source_id AND news_sources.is_verified = true AND news_sources.is_active = true)
);
CREATE POLICY "Only admins can manage news articles" ON news_articles FOR ALL USING (has_role(auth.uid(), 'admin'));

-- news_categories policies
CREATE POLICY "Anyone can view news categories" ON news_categories FOR SELECT USING (true);
CREATE POLICY "Only admins can modify news categories" ON news_categories FOR ALL USING (has_role(auth.uid(), 'admin'));

-- news_sources policies
CREATE POLICY "Anyone can view active news sources" ON news_sources FOR SELECT USING (is_active = true);
CREATE POLICY "Only admins can manage news sources" ON news_sources FOR ALL USING (has_role(auth.uid(), 'admin'));

-- notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- poll_votes policies
CREATE POLICY "Users can view poll votes" ON poll_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote on polls in approved groups" ON poll_votes FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM posts p JOIN groups g ON g.id = p.group_id
    WHERE p.id = poll_votes.post_id AND g.is_approved = true AND p.poll_question IS NOT NULL
  )
);

-- post_drafts policies
CREATE POLICY "Users can manage their own drafts" ON post_drafts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all drafts" ON post_drafts FOR ALL USING (has_role(auth.uid(), 'admin'));

-- post_media policies
CREATE POLICY "Users can view post media for visible posts" ON post_media FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM posts p JOIN groups g ON g.id = p.group_id
    WHERE p.id = post_media.post_id AND g.is_approved = true AND 
    (g.is_public = true OR (g.is_public = false AND EXISTS (
      SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = auth.uid() AND gm.status = 'approved'
    )))
  )
);
CREATE POLICY "System can manage post media during publishing" ON post_media FOR ALL USING (true);

-- posts policies
CREATE POLICY "Users can view posts in public approved groups" ON posts FOR SELECT USING (
  EXISTS (SELECT 1 FROM groups g WHERE g.id = posts.group_id AND g.is_approved = true AND g.is_public = true)
);
CREATE POLICY "Members can view posts in private groups they belong to" ON posts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM groups g JOIN group_members gm ON g.id = gm.group_id
    WHERE g.id = posts.group_id AND g.is_approved = true AND g.is_public = false AND gm.user_id = auth.uid() AND gm.status = 'approved'
  )
);
CREATE POLICY "Users can create posts in approved groups" ON posts FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM groups g WHERE g.id = posts.group_id AND g.is_approved = true)
);
CREATE POLICY "Post creators and moderators can update posts" ON posts FOR UPDATE USING (
  auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR is_group_admin_or_moderator(group_id, auth.uid())
);
CREATE POLICY "Post creators and moderators can delete posts" ON posts FOR DELETE USING (
  auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR is_group_admin_or_moderator(group_id, auth.uid())
);

-- profiles policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view basic profile info of others" ON profiles FOR SELECT USING (auth.uid() <> user_id AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- reactions policies
CREATE POLICY "Users can view all reactions" ON reactions FOR SELECT USING (true);
CREATE POLICY "Users can manage their own reactions" ON reactions FOR ALL USING (auth.uid() = user_id);

-- refresh_tokens policies
CREATE POLICY "System can manage refresh tokens" ON refresh_tokens FOR ALL USING (auth.role() = 'service_role');

-- reports policies
CREATE POLICY "Users can view their own reports" ON reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Admins and moderators can view all reports" ON reports FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));
CREATE POLICY "Users can create reports" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins and moderators can update reports" ON reports FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- sessions policies
CREATE POLICY "Users can view their own sessions" ON sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can revoke their own sessions" ON sessions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "System can manage sessions" ON sessions FOR ALL USING (auth.role() = 'service_role');

-- user_presence policies
CREATE POLICY "Anyone can view user presence" ON user_presence FOR SELECT USING (true);
CREATE POLICY "Users can update their own presence" ON user_presence FOR ALL USING (auth.uid() = user_id);

-- user_roles policies
CREATE POLICY "Users can view all roles" ON user_roles FOR SELECT USING (true);
CREATE POLICY "Only admins can modify roles" ON user_roles FOR ALL USING (has_role(auth.uid(), 'admin'));

-- visitor_stats policies
CREATE POLICY "Anyone can view visitor stats" ON visitor_stats FOR SELECT USING (true);
CREATE POLICY "System can manage visitor stats" ON visitor_stats FOR ALL USING (true);
