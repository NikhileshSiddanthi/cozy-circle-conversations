// Advanced caching utility for scalable performance
import { QueryClient } from '@tanstack/react-query';

class CacheManager {
  private static instance: CacheManager;
  private memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  // Set cache with TTL (time to live)
  set(key: string, data: any, ttlMs: number = 5 * 60 * 1000): void {
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  // Get cached data if not expired
  get<T>(key: string): T | null {
    const cached = this.memoryCache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      this.memoryCache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  // Clear expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.memoryCache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.memoryCache.delete(key);
      }
    }
  }

  // Clear all cache
  clear(): void {
    this.memoryCache.clear();
  }

  // Get cache stats for monitoring
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.memoryCache.size,
      keys: Array.from(this.memoryCache.keys())
    };
  }
}

export const cache = CacheManager.getInstance();

// Enhanced QueryClient with optimized settings for scale
export const createOptimizedQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as any).status;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      // Use cache-first strategy
      networkMode: 'online',
    },
    mutations: {
      retry: (failureCount, error) => {
        // Retry network errors but not client errors
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as any).status;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 1;
      },
    },
  },
});

// Cache key generators for consistency
export const cacheKeys = {
  posts: (groupId?: string, limit?: number) => 
    groupId ? ['posts', groupId, limit] : ['posts', 'all', limit],
  post: (id: string) => ['post', id],
  comments: (postId: string) => ['comments', postId],
  groups: (categoryId?: string) => 
    categoryId ? ['groups', categoryId] : ['groups', 'all'],
  categories: () => ['categories'],
  userProfile: (userId: string) => ['profile', userId],
  notifications: (userId: string) => ['notifications', userId],
  trending: () => ['trending'],
} as const;

// Automatic cache cleanup every 10 minutes
setInterval(() => {
  cache.cleanup();
}, 10 * 60 * 1000);