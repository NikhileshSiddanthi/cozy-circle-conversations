import { useState, useEffect, useCallback, useRef } from 'react';
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

interface UseAutoLinkPreviewReturn {
  previews: LinkPreview[];
  loading: boolean;
  processText: (text: string) => void;
  removePreview: (url: string) => void;
  clearAllPreviews: () => void;
}

// Enhanced URL regex to better detect various URL formats
const URL_REGEX = /(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&=]*))/gi;

export function useAutoLinkPreview(): UseAutoLinkPreviewReturn {
  const [previews, setPreviews] = useState<LinkPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [processedUrls, setProcessedUrls] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const debounceRef = useRef<NodeJS.Timeout>();

  const fetchPreview = useCallback(async (url: string) => {
    // Skip if already processing this URL
    if (processedUrls.has(url)) return;

    try {
      // Validate URL format
      new URL(url);
    } catch {
      console.warn('Invalid URL format:', url);
      return;
    }

    setProcessedUrls(prev => new Set([...prev, url]));
    setLoading(true);

    try {
      console.log('🔗 Auto-fetching preview for:', url);
      
      const { data, error: functionError } = await supabase.functions.invoke('fetch-url-metadata', {
        body: { url: url.trim() }
      });

      if (functionError) {
        console.error('❌ Link preview function error:', functionError);
        return;
      }

      if (data) {
        console.log('✅ Auto-preview fetched:', data);
        setPreviews(prev => {
          // Check if preview for this URL already exists
          const existingIndex = prev.findIndex(p => p.url === url);
          if (existingIndex >= 0) {
            // Update existing preview
            const updated = [...prev];
            updated[existingIndex] = data;
            return updated;
          } else {
            // Add new preview
            return [...prev, data];
          }
        });

        if (data.fetch_error) {
          console.warn('Preview had errors but still usable:', data.fetch_error);
        }
      }
    } catch (error) {
      console.error('❌ Failed to auto-fetch preview:', error);
    } finally {
      setLoading(false);
    }
  }, [processedUrls]);

  const processText = useCallback((text: string) => {
    // Clear debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce URL detection to avoid excessive requests
    debounceRef.current = setTimeout(() => {
      const urls = text.match(URL_REGEX);
      
      if (urls) {
        // Get unique URLs
        const uniqueUrls = [...new Set(urls)];
        
        // Remove previews for URLs no longer in text
        setPreviews(prev => 
          prev.filter(preview => uniqueUrls.includes(preview.url))
        );
        
        // Fetch previews for new URLs
        uniqueUrls.forEach(url => {
          if (!processedUrls.has(url)) {
            fetchPreview(url);
          }
        });
      } else {
        // No URLs found, clear all previews
        setPreviews([]);
        setProcessedUrls(new Set());
      }
    }, 300); // 300ms debounce
  }, [fetchPreview, processedUrls]);

  const removePreview = useCallback((url: string) => {
    setPreviews(prev => prev.filter(p => p.url !== url));
    setProcessedUrls(prev => {
      const updated = new Set(prev);
      updated.delete(url);
      return updated;
    });
  }, []);

  const clearAllPreviews = useCallback(() => {
    setPreviews([]);
    setProcessedUrls(new Set());
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    previews,
    loading,
    processText,
    removePreview,
    clearAllPreviews
  };
}