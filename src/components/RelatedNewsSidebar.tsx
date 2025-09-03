import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, ExternalLink, Newspaper } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRelatedNews } from '@/hooks/useRelatedNews';
import { Skeleton } from '@/components/ui/skeleton';

interface RelatedNewsSidebarProps {
  postTitle: string;
}

export const RelatedNewsSidebar = ({ postTitle }: RelatedNewsSidebarProps) => {
  const { articles, loading, error } = useRelatedNews(postTitle);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            Related News
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            Related News
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Unable to load related news at the moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            Related News
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No related news found.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="h-5 w-5" />
          Related News
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {articles.slice(0, 5).map((article) => (
          <div key={article.id} className="space-y-2 pb-4 border-b border-border last:border-b-0 last:pb-0">
            {/* Thumbnail */}
            {article.image_url && (
              <div className="aspect-video overflow-hidden rounded-md">
                <img 
                  src={article.image_url} 
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            {/* Content */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium leading-tight line-clamp-2">
                {article.title}
              </h4>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium">{article.source.name}</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}
                </div>
              </div>
              
              {article.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {article.description}
                </p>
              )}
              
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">
                  {article.category.name}
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-6 text-xs"
                  onClick={() => window.open(article.url, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes')}
                >
                  Read <ExternalLink className="h-2 w-2 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};