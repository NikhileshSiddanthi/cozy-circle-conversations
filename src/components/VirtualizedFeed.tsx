// Simplified virtual scrolling component for scalable feeds
import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { PostCard } from './PostCard';
import { Skeleton } from './ui/skeleton';

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  group_id: string;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  media_type: string | null;
  media_url: string | null;
  media_thumbnail: string | null;
  poll_question: string | null;
  poll_options: string[] | null;
  is_pinned: boolean;
  is_edited?: boolean;
  profiles: {
    display_name: string | null;
  } | null;
  groups?: {
    name: string;
  };
  post_media?: Array<{
    id: string;
    url: string;
    thumbnail_url?: string;
    caption?: string;
    alt?: string;
    order_index: number;
  }>;
}

interface VirtualizedFeedProps {
  posts: Post[];
  hasNextPage?: boolean;
  isLoading: boolean;
  loadMore: () => void;
  height?: number;
}

// Optimized skeleton component
const PostSkeleton: React.FC = React.memo(() => (
  <div className="bg-card rounded-lg border p-6 space-y-4 mb-4">
    <div className="flex items-center space-x-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-3 w-[100px]" />
      </div>
    </div>
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-32 w-full" />
    <div className="flex space-x-4">
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-8 w-16" />
    </div>
  </div>
));
PostSkeleton.displayName = 'PostSkeleton';

export const VirtualizedFeed: React.FC<VirtualizedFeedProps> = ({
  posts,
  hasNextPage = false,
  isLoading,
  loadMore,
  height = 600,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
  
  // Intersection observer for infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasNextPage && !isLoading) {
          loadMore();
        }
      },
      {
        rootMargin: '200px',
        threshold: 0.1,
      }
    );
    
    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }
    
    return () => observer.disconnect();
  }, [hasNextPage, isLoading, loadMore]);

  // Calculate visible items for performance
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const itemHeight = 300; // Approximate item height
    
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
    const end = Math.min(posts.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + 2);
    
    setVisibleRange({ start, end });
  }, [posts.length]);
  
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Render visible posts with virtual padding
  const visiblePosts = useMemo(() => {
    return posts.slice(visibleRange.start, visibleRange.end);
  }, [posts, visibleRange]);

  return (
    <div 
      ref={containerRef}
      className="w-full overflow-auto scrollbar-thin scrollbar-track-background scrollbar-thumb-muted-foreground"
      style={{ height }}
    >
      {/* Virtual padding for items above visible range */}
      {visibleRange.start > 0 && (
        <div style={{ height: visibleRange.start * 300 }} />
      )}
      
      {/* Render visible posts */}
      {visiblePosts.map((post) => (
        <div key={post.id} className="mb-4">
          <PostCard post={post} />
        </div>
      ))}
      
      {/* Loading skeletons */}
      {isLoading && (
        <>
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </>
      )}
      
      {/* Sentinel for infinite scroll */}
      {hasNextPage && (
        <div ref={sentinelRef} className="h-4 flex justify-center">
          <div className="animate-pulse text-muted-foreground">Loading more posts...</div>
        </div>
      )}
      
      {/* Virtual padding for items below visible range */}
      {visibleRange.end < posts.length && (
        <div style={{ height: (posts.length - visibleRange.end) * 300 }} />
      )}
    </div>
  );
};

export default VirtualizedFeed;