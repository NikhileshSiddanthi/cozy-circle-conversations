import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image_url?: string;
  provider?: string;
  embed_html?: string;
  content_type?: string;
  favicon_url?: string;
  fetched_at: string;
  fetch_error?: string;
}

interface UseLinkPreviewReturn {
  preview: LinkPreview | null;
  loading: boolean;
  error: string | null;
  fetchPreview: (url: string) => Promise<void>;
  clearPreview: () => void;
}

const URL_REGEX = /https?:\/\/[^\s]+/gi;

export function useLinkPreview(): UseLinkPreviewReturn {
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPreview = useCallback(async (url: string) => {
    if (!url.trim()) return;

    // Validate URL format
    try {
      new URL(url);
    } catch {
      setError('Invalid URL format');
      return;
    }

    console.log('🔗 Starting link preview fetch for:', url);
    setLoading(true);
    setError(null);

    try {
      console.log('📡 Calling fetch-url-metadata function...');
      const { data, error: functionError } = await supabase.functions.invoke('fetch-url-metadata', {
        body: { url: url.trim() }
      });

      console.log('📡 Function response:', { data, error: functionError });

      if (functionError) {
        console.error('❌ Link preview function error:', functionError);
        throw new Error(functionError.message || 'Failed to fetch link preview');
      }

      if (data) {
        console.log('✅ Setting preview data:', data);
        setPreview(data);
        
        if (data.fetch_error) {
          toast({
            title: "Preview Limited",
            description: "Basic preview created - the link will still work.",
            variant: "default"
          });
        } else {
          toast({
            title: "Preview Generated",
            description: "Successfully fetched link preview.",
          });
        }
      } else {
        console.warn('⚠️ No data returned from function');
      }
    } catch (err) {
      console.error('❌ Failed to fetch link preview:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      
      toast({
        title: "Preview Failed",
        description: "Could not generate preview, but the link will still work in your post.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const clearPreview = useCallback(() => {
    setPreview(null);
    setError(null);
  }, []);

  return {
    preview,
    loading,
    error,
    fetchPreview,
    clearPreview
  };
}

/**
 * Extract the first URL from text content
 */
export function extractFirstUrl(text: string): string | null {
  const matches = text.match(URL_REGEX);
  return matches ? matches[0] : null;
}

/**
 * Detect if text contains URLs
 */
export function hasUrl(text: string): boolean {
  return URL_REGEX.test(text);
}