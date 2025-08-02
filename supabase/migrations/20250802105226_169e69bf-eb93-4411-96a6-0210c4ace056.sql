-- Fix security warnings by adding search_path to functions
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
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO '';

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
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO '';