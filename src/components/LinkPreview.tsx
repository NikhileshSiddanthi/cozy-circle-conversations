import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, X, Globe, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  canonicalUrl?: string;
}

interface LinkPreviewProps {
  onPreviewGenerated: (preview: LinkPreviewData | null) => void;
  currentPreview?: LinkPreviewData | null;
}

export const LinkPreview: React.FC<LinkPreviewProps> = ({
  onPreviewGenerated,
  currentPreview
}) => {
  const { toast } = useToast();
  const [url, setUrl] = useState(currentPreview?.url || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidUrl = (urlString: string) => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  const fetchPreview = useCallback(async (targetUrl: string) => {
    if (!isValidUrl(targetUrl)) {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // In a real implementation, this would call a backend service
      // For now, we'll create a basic preview from the URL
      const urlObj = new URL(targetUrl);
      
      const preview: LinkPreviewData = {
        url: targetUrl,
        title: urlObj.hostname,
        description: `Link to ${urlObj.hostname}`,
        siteName: urlObj.hostname,
        canonicalUrl: targetUrl
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      onPreviewGenerated(preview);
      
      toast({
        title: "Preview Generated",
        description: "Link preview has been created successfully",
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate preview';
      setError(errorMessage);
      toast({
        title: "Preview Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [onPreviewGenerated, toast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      fetchPreview(url.trim());
    }
  };

  const removePreview = () => {
    onPreviewGenerated(null);
    setUrl('');
    setError(null);
  };

  if (currentPreview) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Link Preview</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removePreview}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          <div 
            className="border border-border/50 rounded-lg p-3 hover:bg-accent/50 cursor-pointer transition-colors"
            onClick={() => {
              // Open within app if it's our domain, otherwise external
              const isCurrentDomain = currentPreview.url.includes(window.location.hostname);
              if (isCurrentDomain) {
                const path = new URL(currentPreview.url).pathname;
                window.location.href = path;
              } else {
                window.location.href = currentPreview.url;
              }
            }}
          >
            <div className="flex items-start gap-3">
              {currentPreview.image && (
                <img
                  src={currentPreview.image}
                  alt="Link preview"
                  className="w-16 h-16 object-cover rounded flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm line-clamp-2 mb-1">
                  {currentPreview.title || currentPreview.url}
                </h4>
                {currentPreview.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                    {currentPreview.description}
                  </p>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ExternalLink className="h-3 w-3" />
                  <span className="truncate">
                    {currentPreview.siteName || new URL(currentPreview.url).hostname}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
            disabled={loading}
          />
          <Button
            type="submit"
            disabled={loading || !url.trim()}
            className="px-4"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Preview'
            )}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </form>

      <div className="text-center py-8 text-muted-foreground">
        <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">
          Enter a URL to generate a preview card
        </p>
        <p className="text-xs mt-1">
          The preview will show the page title, description, and thumbnail
        </p>
      </div>
    </div>
  );
};