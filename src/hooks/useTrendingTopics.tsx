import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TrendingTopic {
  topic: string;
  mentions: number;
  unique_users: number;
  trend_change: number;
  score: number;
}

// Common stopwords to exclude
const STOPWORDS = new Set([
  'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
  'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their',
  'a', 'an', 'as', 'if', 'so', 'than', 'too', 'very', 'can', 'just', 'now',
  'all', 'any', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'about', 'after',
  'again', 'against', 'because', 'before', 'below', 'between', 'down', 'during',
  'from', 'into', 'off', 'over', 'through', 'under', 'until', 'up', 'while'
]);

export const useTrendingTopics = (daysRange: number = 7) => {
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrendingTopics();
  }, [daysRange]);

  const extractKeywords = (text: string): string[] => {
    if (!text) return [];
    
    // Extract hashtags and regular words
    const words = text
      .toLowerCase()
      .replace(/[^\w\s#]/g, ' ') // Remove punctuation except hashtags
      .split(/\s+/)
      .filter(word => word.length > 2) // Filter short words
      .filter(word => !STOPWORDS.has(word.replace('#', ''))) // Remove stopwords
      .map(word => word.trim())
      .filter(word => word.length > 0);

    return words;
  };

  const fetchTrendingTopics = async () => {
    try {
      setLoading(true);
      setError(null);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysRange);

      const prevStartDate = new Date();
      prevStartDate.setDate(prevStartDate.getDate() - (daysRange * 2));
      const prevEndDate = new Date();
      prevEndDate.setDate(prevEndDate.getDate() - daysRange);

      // Fetch posts from approved groups in the date range
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(`
          title,
          content,
          user_id,
          groups!inner(is_approved)
        `)
        .eq('groups.is_approved', true)
        .gte('created_at', startDate.toISOString());

      if (postsError) throw postsError;

      // Fetch comments from approved groups in the date range
      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select(`
          content,
          user_id,
          posts!inner(
            groups!inner(is_approved)
          )
        `)
        .eq('posts.groups.is_approved', true)
        .gte('created_at', startDate.toISOString());

      if (commentsError) throw commentsError;

      // Extract keywords from current period
      const currentKeywordData = new Map<string, Set<string>>();
      
      // Process posts
      (posts || []).forEach(post => {
        const text = `${post.title || ''} ${post.content || ''}`;
        const keywords = extractKeywords(text);
        
        keywords.forEach(keyword => {
          if (!currentKeywordData.has(keyword)) {
            currentKeywordData.set(keyword, new Set());
          }
          currentKeywordData.get(keyword)!.add(post.user_id);
        });
      });

      // Process comments
      (comments || []).forEach(comment => {
        const keywords = extractKeywords(comment.content || '');
        
        keywords.forEach(keyword => {
          if (!currentKeywordData.has(keyword)) {
            currentKeywordData.set(keyword, new Set());
          }
          currentKeywordData.get(keyword)!.add(comment.user_id);
        });
      });

      // Get previous period data for comparison
      const { data: prevPosts } = await supabase
        .from('posts')
        .select(`
          title,
          content,
          user_id,
          groups!inner(is_approved)
        `)
        .eq('groups.is_approved', true)
        .gte('created_at', prevStartDate.toISOString())
        .lt('created_at', prevEndDate.toISOString());

      const { data: prevComments } = await supabase
        .from('comments')
        .select(`
          content,
          user_id,
          posts!inner(
            groups!inner(is_approved)
          )
        `)
        .eq('posts.groups.is_approved', true)
        .gte('created_at', prevStartDate.toISOString())
        .lt('created_at', prevEndDate.toISOString());

      // Extract keywords from previous period
      const prevKeywordData = new Map<string, Set<string>>();
      
      (prevPosts || []).forEach(post => {
        const text = `${post.title || ''} ${post.content || ''}`;
        const keywords = extractKeywords(text);
        
        keywords.forEach(keyword => {
          if (!prevKeywordData.has(keyword)) {
            prevKeywordData.set(keyword, new Set());
          }
          prevKeywordData.get(keyword)!.add(post.user_id);
        });
      });

      (prevComments || []).forEach(comment => {
        const keywords = extractKeywords(comment.content || '');
        
        keywords.forEach(keyword => {
          if (!prevKeywordData.has(keyword)) {
            prevKeywordData.set(keyword, new Set());
          }
          prevKeywordData.get(keyword)!.add(comment.user_id);
        });
      });

      // Calculate trending topics
      const trendingData: TrendingTopic[] = [];
      
      currentKeywordData.forEach((users, keyword) => {
        const mentions = users.size;
        const unique_users = users.size;
        
        // Calculate score based on mentions and unique users
        const score = mentions * 0.7 + unique_users * 0.3;
        
        // Calculate trend change
        const prevMentions = prevKeywordData.get(keyword)?.size || 0;
        const trend_change = prevMentions > 0 
          ? ((mentions - prevMentions) / prevMentions) * 100
          : mentions > 0 ? 100 : 0;
        
        // Only include topics with meaningful activity
        if (mentions >= 2) {
          trendingData.push({
            topic: keyword,
            mentions,
            unique_users,
            trend_change: Math.round(trend_change),
            score
          });
        }
      });

      // Sort by score and limit to top 10
      const sortedTrending = trendingData
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      setTrendingTopics(sortedTrending);
    } catch (err) {
      console.error('Error fetching trending topics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch trending topics');
    } finally {
      setLoading(false);
    }
  };

  return { trendingTopics, loading, error, refetch: fetchTrendingTopics };
};