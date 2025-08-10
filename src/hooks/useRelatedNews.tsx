import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NewsSource {
  id: string;
  name: string;
  domain: string;
  description: string;
  logo_url?: string;
  is_verified: boolean;
}

interface NewsCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color_class: string;
}

interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  image_url?: string;
  published_at: string;
  author?: string;
  tags: string[];
  view_count: number;
  like_count: number;
  is_featured: boolean;
  source: NewsSource;
  category: NewsCategory;
}

// Common English stopwords to filter out
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
  'his', 'hers', 'its', 'our', 'their', 'what', 'where', 'when', 'why', 'how', 'which', 'who'
]);

const extractKeywords = (title: string): string[] => {
  // Split title into words and clean them
  const words = title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => 
      word.length > 2 && // At least 3 characters
      !STOPWORDS.has(word) && // Not a stopword
      !word.match(/^\d+$/) // Not just numbers
    );
  
  // Remove duplicates and take the first 5 most significant words
  const uniqueWords = Array.from(new Set(words));
  return uniqueWords.slice(0, 5);
};

export const useRelatedNews = (postTitle: string) => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postTitle || postTitle.trim().length === 0) {
      return;
    }

    const fetchRelatedNews = async () => {
      try {
        setLoading(true);
        setError(null);

        // Extract keywords from post title
        const keywords = extractKeywords(postTitle);
        
        if (keywords.length === 0) {
          setArticles([]);
          return;
        }

        // Try to fetch fresh news with keywords
        try {
          const { error: fetchError } = await supabase.functions.invoke('fetch-news', {
            body: { 
              query: keywords.join(' '),
              limit: 10 // Request more to have options after filtering
            }
          });
          
          if (fetchError) {
            console.warn('Failed to fetch fresh news:', fetchError);
          }
        } catch (fetchError) {
          console.warn('Error calling fetch-news function:', fetchError);
        }

        // Fetch from database with keyword matching
        const { data: articlesData, error: articlesError } = await supabase
          .from('news_articles')
          .select(`
            *,
            source:news_sources(*),
            category:news_categories(*)
          `)
          .or(
            keywords.map(keyword => 
              `title.ilike.%${keyword}%,description.ilike.%${keyword}%,tags.cs.{${keyword}}`
            ).join(',')
          )
          .order('published_at', { ascending: false })
          .limit(10);

        if (articlesError) {
          throw articlesError;
        }

        setArticles(articlesData || []);

      } catch (err: any) {
        console.error('Error fetching related news:', err);
        setError(err.message || 'Failed to fetch related news');
      } finally {
        setLoading(false);
      }
    };

    // Debounce the API call
    const timeoutId = setTimeout(fetchRelatedNews, 500);
    
    return () => clearTimeout(timeoutId);
  }, [postTitle]);

  return { articles, loading, error };
};