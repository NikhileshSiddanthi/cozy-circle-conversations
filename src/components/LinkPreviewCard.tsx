import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import OptimizedImage from '@/components/OptimizedImage';
import { 
  ExternalLink, 
  Globe, 
  Youtube, 
  Play,
  Pause,
  X,
  Eye
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

interface LinkPreviewCardProps {
  preview: LinkPreview;
  showRemove?: boolean;
  onRemove?: () => void;
  className?: string;
}

export const LinkPreviewCard = ({ 
  preview, 
  showRemove = false, 
  onRemove,
  className = ""
}: LinkPreviewCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isVideo = preview.content_type === 'video' || preview.provider === 'youtube';
  const domain = new URL(preview.url).hostname;

  const handleExpand = () => {
    if (preview.embed_html) {
      setIsExpanded(!isExpanded);
    } else {
      // Fallback: open in new tab
      window.open(preview.url, '_blank', 'noopener,noreferrer');
    }
  };

  const ProviderIcon = () => {
    switch (preview.provider) {
      case 'youtube':
        return <Youtube className="h-4 w-4 text-red-600" />;
      default:
        return <Globe className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (preview.fetch_error) {
    return (
      <Card className={`border-muted ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <a 
                href={preview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline truncate"
              >
                {preview.url}
              </a>
            </div>
            {showRemove && (
              <Button variant="ghost" size="sm" onClick={onRemove}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-muted hover:border-border transition-colors ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Preview Card */}
          <div className="flex items-start gap-3">
            {/* Thumbnail */}
            <div className="relative flex-shrink-0">
              {preview.image_url && !imageError ? (
                <div className="relative">
                  <OptimizedImage 
                    src={preview.image_url}
                    alt={preview.title || 'Link preview'}
                    className="w-16 h-16 object-cover rounded"
                    onError={() => setImageError(true)}
                  />
                  {isVideo && (
                    <div 
                      className="absolute inset-0 bg-black/20 rounded flex items-center justify-center cursor-pointer hover:bg-black/30 transition-colors"
                      onClick={handleExpand}
                      role="button"
                      tabIndex={0}
                      aria-label="Play video"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleExpand();
                        }
                      }}
                    >
                      <Play className="h-6 w-6 text-white" fill="white" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                  <ProviderIcon />
                </div>
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">
                      <ProviderIcon />
                      <span className="ml-1 capitalize">
                        {preview.provider === 'youtube' ? 'YouTube' : domain}
                      </span>
                    </Badge>
                  </div>
                  
                  <h4 className="font-medium text-sm line-clamp-2 mb-1">
                    {preview.title || 'Untitled'}
                  </h4>
                  
                  {preview.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {preview.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ExternalLink className="h-3 w-3" />
                    <a 
                      href={preview.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline truncate"
                    >
                      {domain}
                    </a>
                    {isVideo && preview.embed_html && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={handleExpand}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        {isExpanded ? 'Hide' : 'Watch'}
                      </Button>
                    )}
                  </div>
                </div>
                
                {showRemove && (
                  <Button variant="ghost" size="sm" onClick={onRemove}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Expanded Embed */}
          {isExpanded && preview.embed_html && (
            <div className="w-full">
              <div 
                className="aspect-video rounded overflow-hidden"
                dangerouslySetInnerHTML={{ __html: preview.embed_html }}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};