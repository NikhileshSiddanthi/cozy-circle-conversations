-- QA Database Triggers
-- Run this AFTER the schema and RLS policies

-- Trigger for automatically creating profiles when users sign up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updating timestamps on profile updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating timestamps on categories
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating timestamps on groups
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating group member counts
CREATE TRIGGER update_group_member_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_group_member_count();

-- Trigger for updating timestamps on posts
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating post counts (likes/dislikes)
CREATE TRIGGER update_post_counts_trigger
  AFTER INSERT OR DELETE ON public.reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_post_counts();

-- Trigger for updating comment counts
CREATE TRIGGER update_comment_counts_on_comments
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_comment_counts();

CREATE TRIGGER update_comment_counts_on_reactions
  AFTER INSERT OR DELETE ON public.reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_comment_counts();

-- Trigger for updating timestamps on comments
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating timestamps on connections
CREATE TRIGGER update_connections_updated_at
  BEFORE UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating timestamps on conversations
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating conversation last message timestamp
CREATE TRIGGER update_conversation_last_message_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_last_message();

-- Trigger for updating timestamps on post_drafts
CREATE TRIGGER update_post_drafts_updated_at
  BEFORE UPDATE ON public.post_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating timestamps on draft_media
CREATE TRIGGER update_draft_media_updated_at
  BEFORE UPDATE ON public.draft_media
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating timestamps on post_media
CREATE TRIGGER update_post_media_updated_at
  BEFORE UPDATE ON public.post_media
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating timestamps on reports
CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating timestamps on news_articles
CREATE TRIGGER update_news_articles_updated_at
  BEFORE UPDATE ON public.news_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating timestamps on news_categories
CREATE TRIGGER update_news_categories_updated_at
  BEFORE UPDATE ON public.news_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating timestamps on news_sources
CREATE TRIGGER update_news_sources_updated_at
  BEFORE UPDATE ON public.news_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating timestamps on visitor_stats
CREATE TRIGGER update_visitor_stats_updated_at
  BEFORE UPDATE ON public.visitor_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating timestamps on sessions
CREATE TRIGGER update_sessions_last_activity
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating timestamps on user_presence
CREATE TRIGGER update_user_presence_updated_at
  BEFORE UPDATE ON public.user_presence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating timestamps on auth_identities
CREATE TRIGGER update_auth_identities_timestamp
  BEFORE UPDATE ON public.auth_identities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_auth_identities_updated_at();
