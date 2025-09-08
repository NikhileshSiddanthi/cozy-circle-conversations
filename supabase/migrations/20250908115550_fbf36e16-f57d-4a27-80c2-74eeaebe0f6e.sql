-- Create a function to cleanup test data (posts, comments, reactions, media)
CREATE OR REPLACE FUNCTION public.cleanup_posts_by_user(_user_id uuid)
RETURNS TABLE (
  deleted_posts integer,
  deleted_comments integer, 
  deleted_reactions integer,
  deleted_post_media integer,
  deleted_drafts integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  posts_count integer := 0;
  comments_count integer := 0;
  reactions_count integer := 0;
  media_count integer := 0;
  drafts_count integer := 0;
BEGIN
  -- Count and delete reactions for posts by this user
  SELECT COUNT(*) INTO reactions_count
  FROM reactions r
  WHERE r.post_id IN (SELECT id FROM posts WHERE user_id = _user_id)
     OR r.comment_id IN (SELECT c.id FROM comments c 
                         JOIN posts p ON c.post_id = p.id 
                         WHERE p.user_id = _user_id);
  
  DELETE FROM reactions r
  WHERE r.post_id IN (SELECT id FROM posts WHERE user_id = _user_id)
     OR r.comment_id IN (SELECT c.id FROM comments c 
                         JOIN posts p ON c.post_id = p.id 
                         WHERE p.user_id = _user_id);

  -- Count and delete comments on posts by this user
  SELECT COUNT(*) INTO comments_count
  FROM comments c
  JOIN posts p ON c.post_id = p.id
  WHERE p.user_id = _user_id;
  
  DELETE FROM comments c
  USING posts p
  WHERE c.post_id = p.id AND p.user_id = _user_id;

  -- Count and delete post media
  SELECT COUNT(*) INTO media_count
  FROM post_media pm
  WHERE pm.post_id IN (SELECT id FROM posts WHERE user_id = _user_id);
  
  DELETE FROM post_media pm
  WHERE pm.post_id IN (SELECT id FROM posts WHERE user_id = _user_id);

  -- Count and delete posts
  SELECT COUNT(*) INTO posts_count
  FROM posts WHERE user_id = _user_id;
  
  DELETE FROM posts WHERE user_id = _user_id;

  -- Count and delete drafts and draft media
  SELECT COUNT(*) INTO drafts_count
  FROM post_drafts WHERE user_id = _user_id;
  
  DELETE FROM draft_media WHERE user_id = _user_id;
  DELETE FROM post_drafts WHERE user_id = _user_id;

  RETURN QUERY SELECT posts_count, comments_count, reactions_count, media_count, drafts_count;
END;
$$;