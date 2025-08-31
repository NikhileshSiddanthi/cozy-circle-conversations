-- Fix the update_comment_counts function to handle correct field names
CREATE OR REPLACE FUNCTION public.update_comment_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- For comments table operations (post_id will be set)
    IF TG_TABLE_NAME = 'comments' THEN
      -- Update comment count for posts
      UPDATE public.posts 
      SET comment_count = (SELECT COUNT(*) FROM public.comments WHERE post_id = NEW.post_id)
      WHERE id = NEW.post_id;
      RETURN NEW;
    END IF;
    
    -- For reactions table operations (both post_id and comment_id might be set)
    IF TG_TABLE_NAME = 'reactions' THEN
      -- Update comment count for posts if this is a comment reaction
      IF NEW.post_id IS NOT NULL THEN
        UPDATE public.posts 
        SET comment_count = (SELECT COUNT(*) FROM public.comments WHERE post_id = NEW.post_id)
        WHERE id = NEW.post_id;
      END IF;
      
      -- Update like/dislike counts for comments if this is a comment reaction
      IF NEW.comment_id IS NOT NULL THEN
        UPDATE public.comments 
        SET 
          like_count = (SELECT COUNT(*) FROM public.reactions WHERE comment_id = NEW.comment_id AND reaction_type = 'like'),
          dislike_count = (SELECT COUNT(*) FROM public.reactions WHERE comment_id = NEW.comment_id AND reaction_type = 'dislike')
        WHERE id = NEW.comment_id;
      END IF;
      RETURN NEW;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- For comments table operations
    IF TG_TABLE_NAME = 'comments' THEN
      -- Update comment count for posts
      UPDATE public.posts 
      SET comment_count = (SELECT COUNT(*) FROM public.comments WHERE post_id = OLD.post_id)
      WHERE id = OLD.post_id;
      RETURN OLD;
    END IF;
    
    -- For reactions table operations
    IF TG_TABLE_NAME = 'reactions' THEN
      -- Update comment count for posts if this was a comment reaction
      IF OLD.post_id IS NOT NULL THEN
        UPDATE public.posts 
        SET comment_count = (SELECT COUNT(*) FROM public.comments WHERE post_id = OLD.post_id)
        WHERE id = OLD.post_id;
      END IF;
      
      -- Update like/dislike counts for comments if this was a comment reaction
      IF OLD.comment_id IS NOT NULL THEN
        UPDATE public.comments 
        SET 
          like_count = (SELECT COUNT(*) FROM public.reactions WHERE comment_id = OLD.comment_id AND reaction_type = 'like'),
          dislike_count = (SELECT COUNT(*) FROM public.reactions WHERE comment_id = OLD.comment_id AND reaction_type = 'dislike')
        WHERE id = OLD.comment_id;
      END IF;
      RETURN OLD;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$;