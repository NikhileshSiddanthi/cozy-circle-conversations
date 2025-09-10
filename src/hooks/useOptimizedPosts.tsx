// Optimized posts hook with caching, real-time updates, and performance monitoring
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cache, cacheKeys } from '@/lib/cache';
import { useToast } from '@/hooks/use-toast';

interface UseOptimizedPostsOptions {
  groupId?: string;
  limit?: number;
  enableRealtime?: boolean;
  cacheTime?: number;
}

export const useOptimizedPosts = ({
  groupId,
  limit = 20,
  enableRealtime = true,
  cacheTime = 5 * 60 * 1000, // 5 minutes
}: UseOptimizedPostsOptions = {}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Generate cache key
  const queryKey = useMemo(() => 
    cacheKeys.posts(groupId, limit), 
    [groupId, limit]
  );

  // Optimized fetch function with caching
  const fetchPosts = useCallback(async ({ pageParam = 0 }) => {
    const cacheKey = `posts-${groupId || 'all'}-${pageParam}-${limit}`;
    
    // Try cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const startRange = pageParam;
    const endRange = startRange + limit - 1;

    let query = supabase
      .from('posts')
      .select(`
        id,
        title,
        content,
        created_at,
        updated_at,
        user_id,
        group_id,
        like_count,
        dislike_count,
        comment_count,
        is_pinned,
        profiles:user_id (
          display_name,
          avatar_url
        ),
        groups:group_id (
          name,
          description
        ),
        post_media (
          id,
          url,
          thumbnail_url,
          mime_type,
          order_index
        )
      `)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(startRange, endRange);

    // Apply group filter if specified
    if (groupId) {
      query = query.eq('group_id', groupId);
    } else {
      // Only show posts from public approved groups if no specific group
      const { data: publicGroups } = await supabase
        .from('groups')
        .select('id')
        .eq('is_public', true)
        .eq('is_approved', true);
      
      const publicGroupIds = publicGroups?.map(g => g.id) || [];
      if (publicGroupIds.length > 0) {
        query = query.in('group_id', publicGroupIds);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }

    const result = data || [];
    
    // Cache the result
    cache.set(cacheKey, result, cacheTime);

    return result;
  }, [groupId, limit, cacheTime]);

  // Infinite query with optimizations
  const query = useInfiniteQuery({
    queryKey,
    queryFn: fetchPosts,
    initialPageParam: 0,
    getNextPageParam: (lastPage: any[], allPages: any[][]) => {
      if (!Array.isArray(lastPage) || lastPage.length < limit) return undefined;
      return allPages.length * limit;
    },
    staleTime: cacheTime,
    gcTime: cacheTime * 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });

  // Flatten pages into single array
  const posts = useMemo(() => 
    query.data?.pages.flat() || [],
    [query.data]
  );

  // Real-time subscription for live updates
  useEffect(() => {
    if (!enableRealtime) return;

    const channel = supabase
      .channel('posts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: groupId ? `group_id=eq.${groupId}` : undefined,
        },
        (payload) => {
          console.log('Real-time post update:', payload);
          
          // Invalidate cache and refetch
          cache.clear();
          queryClient.invalidateQueries({ queryKey });

          // Show toast for new posts
          if (payload.eventType === 'INSERT') {
            toast({
              title: 'New Post',
              description: 'A new post has been added to the feed',
              duration: 3000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enableRealtime, groupId, queryClient, queryKey, toast]);

  // Prefetch next page for better UX
  const prefetchNextPage = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query]);

  // Optimized load more function
  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query]);

  // Performance metrics
  const metrics = useMemo(() => ({
    totalPosts: posts.length,
    pagesLoaded: query.data?.pages.length || 0,
    cacheHitRate: cache.getStats(),
    isOptimistic: query.isPending && posts.length > 0,
  }), [posts.length, query.data?.pages.length, query.isPending]);

  return {
    posts,
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    loadMore,
    prefetchNextPage,
    refetch: query.refetch,
    metrics,
  };
};

export default useOptimizedPosts;