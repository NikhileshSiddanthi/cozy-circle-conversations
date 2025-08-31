-- Create missing triggers for automatic count updates

-- Create triggers for reactions table to update counts
CREATE OR REPLACE TRIGGER update_reaction_counts
  AFTER INSERT OR DELETE ON public.reactions
  FOR EACH ROW EXECUTE FUNCTION public.update_post_counts();

-- Create triggers for comments table to update post comment counts  
CREATE OR REPLACE TRIGGER update_comment_counts_trigger
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_comment_counts();

-- Create triggers for reactions on comments to update comment like/dislike counts
CREATE OR REPLACE TRIGGER update_comment_reaction_counts
  AFTER INSERT OR DELETE ON public.reactions
  FOR EACH ROW EXECUTE FUNCTION public.update_comment_counts();