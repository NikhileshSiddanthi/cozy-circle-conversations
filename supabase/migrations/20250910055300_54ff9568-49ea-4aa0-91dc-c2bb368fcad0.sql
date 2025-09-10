-- Add critical database indexes for scalability
-- These indexes will dramatically improve query performance for large datasets

-- Posts table indexes (most critical for feed performance)
CREATE INDEX IF NOT EXISTS idx_posts_created_at_desc ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_group_id ON public.posts (group_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts (user_id);
CREATE INDEX IF NOT EXISTS idx_posts_group_created ON public.posts (group_id, created_at DESC);

-- Comments table indexes (for post detail pages)
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments (post_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_created ON public.comments (post_id, created_at DESC);

-- Reactions table indexes (for like/dislike performance)
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON public.reactions (post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_comment_id ON public.reactions (comment_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_post ON public.reactions (user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_comment ON public.reactions (user_id, comment_id);

-- Group members indexes (for membership checks)
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_status ON public.group_members (group_id, status);
CREATE INDEX IF NOT EXISTS idx_group_members_user_status ON public.group_members (user_id, status);

-- Post media indexes (for media queries)
CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON public.post_media (post_id);
CREATE INDEX IF NOT EXISTS idx_post_media_order ON public.post_media (post_id, order_index);

-- Draft media indexes (for draft management)
CREATE INDEX IF NOT EXISTS idx_draft_media_draft_id ON public.draft_media (draft_id);
CREATE INDEX IF NOT EXISTS idx_draft_media_user_id ON public.draft_media (user_id);

-- Notifications indexes (for notification queries)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);

-- Groups indexes (for category and search performance)
CREATE INDEX IF NOT EXISTS idx_groups_category_id ON public.groups (category_id);
CREATE INDEX IF NOT EXISTS idx_groups_approved_public ON public.groups (is_approved, is_public);
CREATE INDEX IF NOT EXISTS idx_groups_creator_id ON public.groups (creator_id);

-- News articles indexes (for news feed performance)
CREATE INDEX IF NOT EXISTS idx_news_articles_category_published ON public.news_articles (category_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_source_published ON public.news_articles (source_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_featured ON public.news_articles (is_featured, published_at DESC);

-- Poll votes indexes (for poll result queries)
CREATE INDEX IF NOT EXISTS idx_poll_votes_post_id ON public.poll_votes (post_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_post ON public.poll_votes (user_id, post_id);