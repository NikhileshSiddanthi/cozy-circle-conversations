import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Link2, 
  ExternalLink, 
  X, 
  Loader2, 
  AlertCircle,
  Image as ImageIcon,
  Globe
} from 'lucide-react';

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  error?: string;
}

interface LinkPreviewTabProps {
  preview?: LinkPreview;
  onPreviewChange: (preview: LinkPreview | undefined) => void;
}

export const LinkPreviewTab: React.FC<LinkPreviewTabProps> = ({
  preview,
  onPreviewChange
}) => {
  const { toast } = useToast();
  const [url, setUrl] = useState(preview?.url || '');
  const [loading, setLoading] = useState(false);

  const validateUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  };

  const fetchLinkPreview = async (targetUrl: string) => {
    if (!validateUrl(targetUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid HTTP or HTTPS URL.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Call our edge function to fetch real metadata
      const { data, error: functionError } = await supabase.functions.invoke('fetch-url-metadata', {
        body: { url: targetUrl }
      });

      if (functionError) {
        console.error('Function error:', functionError);
        throw functionError;
      }

      if (data && !data.error) {
        const preview: LinkPreview = {
          url: targetUrl,
          title: data.title || new URL(targetUrl).hostname,
          description: data.description || `Link to ${new URL(targetUrl).hostname}`,
          image: data.image || '',
          siteName: data.siteName || new URL(targetUrl).hostname
        };
        
        onPreviewChange(preview);
        
        toast({
          title: "Link Preview Generated",
          description: "Successfully fetched link preview.",
        });
      } else {
        // Fallback for when metadata extraction fails but URL is valid
        const errorPreview: LinkPreview = {
          url: targetUrl,
          title: new URL(targetUrl).hostname,
          description: `Link to ${new URL(targetUrl).hostname}`,
          siteName: new URL(targetUrl).hostname,
          error: data?.error || 'Could not fetch preview. The link will still work in your post.'
        };
        
        onPreviewChange(errorPreview);
        
        toast({
          title: "Preview Generated",
          description: "Created basic preview for the link.",
        });
      }

    } catch (error) {
      console.error('Failed to fetch link preview:', error);
      
      const errorPreview: LinkPreview = {
        url: targetUrl,
        error: 'Failed to fetch preview. The link is still valid and will work in your post.'
      };
      
      onPreviewChange(errorPreview);
      
      toast({
        title: "Preview Generation Failed",
        description: "Could not generate preview, but the link will still work in your post.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      fetchLinkPreview(url.trim());
    }
  };

  const removePreview = () => {
    setUrl('');
    onPreviewChange(undefined);
  };

  return (
    <div className="space-y-4">
      {/* URL Input */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full"
              disabled={loading}
            />
          </div>
          
          <Button
            type="submit"
            disabled={!url.trim() || loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            {loading ? 'Fetching...' : 'Preview'}
          </Button>
        </div>
      </form>

      {/* Link Preview */}
      {preview && (
        <Card>
          <CardContent className="p-4">
            {preview.error ? (
              /* Error State */
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-500 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-orange-700 dark:text-orange-400">
                    Preview Unavailable
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {preview.error}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2 font-mono break-all">
                    {preview.url}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={removePreview}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              /* Success State */
              <div className="space-y-3">
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
                    {preview.siteName && (
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        {preview.siteName}
                      </p>
                    )}
                    
                    <h3 className="font-medium text-sm line-clamp-2">
                      {preview.title || 'Untitled'}
                    </h3>
                    
                    {preview.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {preview.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 mt-2">
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground truncate">
                        {new URL(preview.url).hostname}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={removePreview}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <div className="text-sm text-muted-foreground space-y-2">
        <p>💡 <strong>Link Preview Tips:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>Paste any HTTP or HTTPS URL to generate a preview</li>
          <li>Previews show the page title, description, and thumbnail</li>
          <li>Links will open in a new tab when clicked</li>
          <li>If preview fails, the raw link will still work in your post</li>
        </ul>
      </div>

      {/* Popular Domains */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Quick Examples:</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'GitHub Repo', url: 'https://github.com/microsoft/vscode' },
            { label: 'YouTube Video', url: 'https://youtube.com/watch?v=dQw4w9WgXcQ' },
            { label: 'Medium Article', url: 'https://medium.com/@user/article-title' },
            { label: 'News Article', url: 'https://techcrunch.com/latest-tech-news' }
          ].map((example) => (
            <Button
              key={example.label}
              variant="outline"
              size="sm"
              className="justify-start text-xs"
              onClick={() => setUrl(example.url)}
              disabled={loading}
            >
              {example.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};