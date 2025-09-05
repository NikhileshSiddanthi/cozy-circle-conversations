-- Add critical indexes for performance
CREATE INDEX CONCURRENTLY idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX CONCURRENTLY idx_posts_group_id ON posts(group_id);
CREATE INDEX CONCURRENTLY idx_posts_like_count ON posts(like_count DESC);
CREATE INDEX CONCURRENTLY idx_comments_post_id ON comments(post_id);
CREATE INDEX CONCURRENTLY idx_reactions_post_id ON reactions(post_id);
CREATE INDEX CONCURRENTLY idx_reactions_user_id ON reactions(user_id);
CREATE INDEX CONCURRENTLY idx_group_members_group_id ON group_members(group_id);
CREATE INDEX CONCURRENTLY idx_group_members_user_id ON group_members(user_id);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_posts_group_created ON posts(group_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_reactions_post_user ON reactions(post_id, user_id);

-- Enable better query planning
ANALYZE;