-- Create posts table for group discussions
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'youtube', 'link')),
  media_url TEXT,
  media_thumbnail TEXT,
  poll_question TEXT,
  poll_options JSONB DEFAULT '[]'::jsonb,
  like_count INTEGER DEFAULT 0,
  dislike_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comments table for post discussions
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  dislike_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reactions table for posts and comments
CREATE TABLE public.reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id, reaction_type),
  UNIQUE(user_id, comment_id, reaction_type),
  CHECK ((post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL))
);

-- Create poll_votes table
CREATE TABLE public.poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('group_suggestion', 'group_approved', 'group_rejected', 'new_post', 'new_comment', 'post_liked')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for posts
CREATE POLICY "Users can view posts in approved groups" ON public.posts
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.groups g 
    WHERE g.id = posts.group_id AND g.is_approved = true
  )
);

CREATE POLICY "Group members can create posts" ON public.posts
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.group_members gm
    JOIN public.groups g ON g.id = gm.group_id
    WHERE gm.group_id = posts.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.status = 'active'
    AND g.is_approved = true
  )
);

CREATE POLICY "Post creators and moderators can update posts" ON public.posts
FOR UPDATE USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = posts.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role IN ('moderator', 'admin')
    AND gm.status = 'active'
  ) OR
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Post creators and moderators can delete posts" ON public.posts
FOR DELETE USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = posts.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role IN ('moderator', 'admin')
    AND gm.status = 'active'
  ) OR
  has_role(auth.uid(), 'admin')
);

-- RLS Policies for comments
CREATE POLICY "Users can view comments on visible posts" ON public.comments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.posts p
    JOIN public.groups g ON g.id = p.group_id
    WHERE p.id = comments.post_id AND g.is_approved = true
  )
);

CREATE POLICY "Group members can create comments" ON public.comments
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.posts p
    JOIN public.group_members gm ON gm.group_id = p.group_id
    WHERE p.id = comments.post_id 
    AND gm.user_id = auth.uid() 
    AND gm.status = 'active'
  )
);

CREATE POLICY "Comment creators and moderators can update comments" ON public.comments
FOR UPDATE USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.posts p
    JOIN public.group_members gm ON gm.group_id = p.group_id
    WHERE p.id = comments.post_id 
    AND gm.user_id = auth.uid() 
    AND gm.role IN ('moderator', 'admin')
    AND gm.status = 'active'
  ) OR
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Comment creators and moderators can delete comments" ON public.comments
FOR DELETE USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.posts p
    JOIN public.group_members gm ON gm.group_id = p.group_id
    WHERE p.id = comments.post_id 
    AND gm.user_id = auth.uid() 
    AND gm.role IN ('moderator', 'admin')
    AND gm.status = 'active'
  ) OR
  has_role(auth.uid(), 'admin')
);

-- RLS Policies for reactions
CREATE POLICY "Users can view all reactions" ON public.reactions FOR SELECT USING (true);

CREATE POLICY "Users can manage their own reactions" ON public.reactions
FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for poll votes
CREATE POLICY "Users can view poll votes" ON public.poll_votes FOR SELECT USING (true);

CREATE POLICY "Users can vote on polls" ON public.poll_votes
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.posts p
    JOIN public.group_members gm ON gm.group_id = p.group_id
    WHERE p.id = poll_votes.post_id 
    AND gm.user_id = auth.uid() 
    AND gm.status = 'active'
    AND p.poll_question IS NOT NULL
  )
);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.notifications
FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_posts_group_id ON public.posts(group_id);
CREATE INDEX idx_posts_user_id ON public.posts(user_id);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX idx_comments_post_id ON public.comments(post_id);
CREATE INDEX idx_comments_user_id ON public.comments(user_id);
CREATE INDEX idx_comments_parent_id ON public.comments(parent_comment_id);
CREATE INDEX idx_reactions_post_id ON public.reactions(post_id);
CREATE INDEX idx_reactions_comment_id ON public.reactions(comment_id);
CREATE INDEX idx_reactions_user_id ON public.reactions(user_id);
CREATE INDEX idx_poll_votes_post_id ON public.poll_votes(post_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Create functions to update counts
CREATE OR REPLACE FUNCTION update_post_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.post_id IS NOT NULL THEN
      -- Update like/dislike counts for posts
      UPDATE public.posts 
      SET 
        like_count = (SELECT COUNT(*) FROM public.reactions WHERE post_id = NEW.post_id AND reaction_type = 'like'),
        dislike_count = (SELECT COUNT(*) FROM public.reactions WHERE post_id = NEW.post_id AND reaction_type = 'dislike')
      WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.post_id IS NOT NULL THEN
      -- Update like/dislike counts for posts
      UPDATE public.posts 
      SET 
        like_count = (SELECT COUNT(*) FROM public.reactions WHERE post_id = OLD.post_id AND reaction_type = 'like'),
        dislike_count = (SELECT COUNT(*) FROM public.reactions WHERE post_id = OLD.post_id AND reaction_type = 'dislike')
      WHERE id = OLD.post_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_comment_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update comment count for posts
    UPDATE public.posts 
    SET comment_count = (SELECT COUNT(*) FROM public.comments WHERE post_id = NEW.post_id)
    WHERE id = NEW.post_id;
    
    -- Update like/dislike counts for comments
    IF NEW.comment_id IS NOT NULL THEN
      UPDATE public.comments 
      SET 
        like_count = (SELECT COUNT(*) FROM public.reactions WHERE comment_id = NEW.comment_id AND reaction_type = 'like'),
        dislike_count = (SELECT COUNT(*) FROM public.reactions WHERE comment_id = NEW.comment_id AND reaction_type = 'dislike')
      WHERE id = NEW.comment_id;
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update comment count for posts
    UPDATE public.posts 
    SET comment_count = (SELECT COUNT(*) FROM public.comments WHERE post_id = OLD.post_id)
    WHERE id = OLD.post_id;
    
    -- Update like/dislike counts for comments
    IF OLD.comment_id IS NOT NULL THEN
      UPDATE public.comments 
      SET 
        like_count = (SELECT COUNT(*) FROM public.reactions WHERE comment_id = OLD.comment_id AND reaction_type = 'like'),
        dislike_count = (SELECT COUNT(*) FROM public.reactions WHERE comment_id = OLD.comment_id AND reaction_type = 'dislike')
      WHERE id = OLD.comment_id;
    END IF;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_post_reaction_counts
AFTER INSERT OR DELETE ON public.reactions
FOR EACH ROW
EXECUTE FUNCTION update_post_counts();

CREATE TRIGGER trigger_update_comment_counts
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION update_comment_counts();

CREATE TRIGGER trigger_update_comment_reaction_counts
AFTER INSERT OR DELETE ON public.reactions
FOR EACH ROW
EXECUTE FUNCTION update_comment_counts();