import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLinkPreview, extractFirstUrl } from '@/hooks/useLinkPreview';
import { LinkPreviewCard } from '@/components/LinkPreviewCard';
import { 
  Link2, 
  Loader2
} from 'lucide-react';

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

interface LinkPreviewTabProps {
  preview?: LinkPreview;
  onPreviewChange: (preview: LinkPreview | undefined) => void;
}

export const LinkPreviewTab: React.FC<LinkPreviewTabProps> = ({
  preview: externalPreview,
  onPreviewChange
}) => {
  const { preview, loading, fetchPreview, clearPreview } = useLinkPreview();
  const [url, setUrl] = useState(externalPreview?.url || '');

  // Sync external preview changes
  useEffect(() => {
    if (externalPreview && !preview) {
      setUrl(externalPreview.url);
    }
  }, [externalPreview, preview]);

  // Sync internal preview changes to parent - CRITICAL FIX
  useEffect(() => {
    onPreviewChange(preview);
  }, [preview, onPreviewChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      fetchPreview(url.trim());
    }
  };

  const removePreview = () => {
    setUrl('');
    clearPreview();
    onPreviewChange(undefined);
  };

  // Auto-detect URLs in the input field
  useEffect(() => {
    if (url && url !== externalPreview?.url && !preview) {
      const timeoutId = setTimeout(() => {
        try {
          new URL(url); // Validate URL format
          fetchPreview(url);
        } catch {
          // Invalid URL, do nothing
        }
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [url, externalPreview?.url, preview, fetchPreview]);

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
              placeholder="https://youtu.be/gKuO4MPibL8 or any website"
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
      {(preview || externalPreview) && (
        <LinkPreviewCard 
          preview={preview || externalPreview!}
          showRemove={true}
          onRemove={removePreview}
        />
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