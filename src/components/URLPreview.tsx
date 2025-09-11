import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ExternalLink, Loader2, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface URLPreviewProps {
  url: string;
  onRemove: () => void;
}

interface PreviewData {
  title: string;
  description: string;
  image: string;
  siteName: string;
  error?: string;
}

export const URLPreview = ({ url, onRemove }: URLPreviewProps) => {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        setLoading(true);
        setError(false);
        
        // Simple URL validation
        const urlPattern = /^https?:\/\/.+/;
        if (!urlPattern.test(url)) {
          setError(true);
          return;
        }

        // Call our edge function to fetch real metadata
        const { data, error: functionError } = await supabase.functions.invoke('fetch-url-metadata', {
          body: { url }
        });

        if (functionError) {
          console.error('Function error:', functionError);
          throw functionError;
        }

        if (data && !data.error) {
          setPreview({
            title: data.title || new URL(url).hostname,
            description: data.description || `Link to ${new URL(url).hostname}`,
            image: data.image || '',
            siteName: data.siteName || new URL(url).hostname
          });
        } else {
          // Fallback for when metadata extraction fails but URL is valid
          setPreview({
            title: new URL(url).hostname,
            description: `Link to ${new URL(url).hostname}`,
            image: '',
            siteName: new URL(url).hostname,
            error: data?.error || 'Could not load preview'
          });
        }
      } catch (err) {
        console.error('Preview fetch error:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (url) {
      fetchPreview();
    }
  }, [url]);

  if (loading) {
    return (
      <Card className="border-muted">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading preview...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !preview) {
    return (
      <Card className="border-muted">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-blue-600 hover:underline cursor-pointer">
                {url}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={onRemove}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-muted hover:border-border transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {preview.image ? (
            <img 
              src={preview.image} 
              alt={preview.title}
              className="w-16 h-16 object-cover rounded flex-shrink-0"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-16 h-16 bg-muted rounded flex items-center justify-center flex-shrink-0">
              <Globe className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm line-clamp-2 mb-1">{preview.title}</h4>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {preview.description}
            </p>
            {preview.error && (
              <p className="text-xs text-orange-600 mb-1">
                {preview.error}
              </p>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ExternalLink className="h-3 w-3" />
              <span className="truncate">{preview.siteName}</span>
            </div>
          </div>
          
          <Button variant="ghost" size="sm" onClick={onRemove}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};