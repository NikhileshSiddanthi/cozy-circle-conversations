// Optimized image component with lazy loading, compression, and CDN support
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  quality?: number;
  priority?: boolean;
  placeholder?: 'blur' | 'skeleton';
  blurDataURL?: string;
  sizes?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  quality = 85,
  priority = false,
  placeholder = 'skeleton',
  blurDataURL,
  sizes,
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [inView, setInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Generate optimized image URLs
  const generateOptimizedUrl = useCallback((originalUrl: string, w?: number, q?: number) => {
    // If it's a Supabase storage URL, we can optimize it
    if (originalUrl.includes('supabase.co/storage')) {
      const url = new URL(originalUrl);
      if (w) url.searchParams.set('width', w.toString());
      if (q) url.searchParams.set('quality', q.toString());
      url.searchParams.set('format', 'webp');
      return url.toString();
    }
    
    // For external URLs, return as-is (could integrate with CDN like Cloudinary)
    return originalUrl;
  }, []);

  // Generate srcSet for responsive images
  const generateSrcSet = useCallback(() => {
    if (!width) return undefined;
    
    const breakpoints = [480, 768, 1024, 1280, 1920];
    return breakpoints
      .filter(bp => bp <= width * 2) // Don't generate larger than 2x original
      .map(bp => `${generateOptimizedUrl(src, bp, quality)} ${bp}w`)
      .join(', ');
  }, [src, width, quality, generateOptimizedUrl]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before image is visible
        threshold: 0.1,
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    const error = new Error(`Failed to load image: ${src}`);
    onError?.(error);
  }, [src, onError]);

  // Placeholder component
  const Placeholder = () => {
    if (placeholder === 'blur' && blurDataURL) {
      return (
        <img
          src={blurDataURL}
          alt=""
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-0' : 'opacity-100'
          )}
        />
      );
    }

    return (
      <div
        className={cn(
          'absolute inset-0 bg-muted animate-pulse transition-opacity duration-300',
          isLoaded ? 'opacity-0' : 'opacity-100'
        )}
      />
    );
  };

  // Error state
  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted text-muted-foreground',
          className
        )}
        style={{ width, height }}
      >
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div 
      className={cn('relative overflow-hidden', className)}
      style={{ width, height }}
      ref={imgRef}
    >
      {!isLoaded && <Placeholder />}
      
      {inView && (
        <img
          src={generateOptimizedUrl(src, width, quality)}
          srcSet={generateSrcSet()}
          sizes={sizes}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
};

export default OptimizedImage;