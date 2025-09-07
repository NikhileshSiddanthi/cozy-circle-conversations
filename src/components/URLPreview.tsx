import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ExternalLink, Loader2 } from 'lucide-react';

interface URLPreviewProps {
  url: string;
  onRemove: () => void;
}

interface PreviewData {
  title: string;
  description: string;
  image: string;
  siteName: string;
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

        // For demo purposes, create a mock preview
        // In production, you'd call a backend service
        setPreview({
          title: 'URL Preview',
          description: 'This would show a preview of the linked content',
          image: '',
          siteName: new URL(url).hostname
        });
      } catch {
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
      <CardContent className="p-0">
        <div className="flex">
          {preview.image && (
            <div className="w-20 h-20 flex-shrink-0">
              <img 
                src={preview.image} 
                alt={preview.title}
                className="w-full h-full object-cover rounded-l-lg"
              />
            </div>
          )}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm line-clamp-1">{preview.title}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {preview.description}
                </p>
                <span className="text-xs text-muted-foreground mt-1 block">
                  {preview.siteName}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={onRemove} className="ml-2">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};