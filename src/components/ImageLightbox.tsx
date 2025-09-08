import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, Download, Share2, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CarouselImage } from './MultiImageCarousel';

interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  images: CarouselImage[];
  initialIndex?: number;
  showDownloadButton?: boolean;
  showShareButton?: boolean;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
  showDownloadButton = true,
  showShareButton = true
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => prev > 0 ? prev - 1 : images.length - 1);
    setIsZoomed(false);
    setZoomLevel(1);
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => prev < images.length - 1 ? prev + 1 : 0);
    setIsZoomed(false);
    setZoomLevel(1);
  }, [images.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsZoomed(false);
    setZoomLevel(1);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToPrevious, goToNext, onClose]);

  // Touch/swipe handling
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    if (isZoomed) return; // Disable swipe when zoomed
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (isZoomed) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (isZoomed || !touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && images.length > 1) {
      goToNext();
    }
    if (isRightSwipe && images.length > 1) {
      goToPrevious();
    }
  };

  const handleDownload = async () => {
    const currentImage = images[currentIndex];
    try {
      const response = await fetch(currentImage.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `image-${currentIndex + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded successfully');
    } catch (error) {
      toast.error('Failed to download image');
    }
  };

  const handleShare = async () => {
    const currentImage = images[currentIndex];
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Shared Image',
          text: currentImage.caption || 'Check out this image',
          url: currentImage.url
        });
      } catch (error) {
        // User cancelled share or error occurred
      }
    } else {
      // Fallback to copying URL
      try {
        await navigator.clipboard.writeText(currentImage.url);
        toast.success('Image URL copied to clipboard');
      } catch (error) {
        toast.error('Failed to copy URL');
      }
    }
  };

  const toggleZoom = () => {
    if (isZoomed) {
      setIsZoomed(false);
      setZoomLevel(1);
    } else {
      setIsZoomed(true);
      setZoomLevel(2);
    }
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 4));
    setIsZoomed(true);
  };

  const handleZoomOut = () => {
    const newLevel = Math.max(zoomLevel - 0.5, 1);
    setZoomLevel(newLevel);
    if (newLevel === 1) {
      setIsZoomed(false);
    }
  };

  // Reset state when lightbox opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
      setZoomLevel(1);
    }
  }, [isOpen, initialIndex]);

  if (images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-screen max-h-screen w-screen h-screen p-0 bg-black/95"
      >
        <div className="relative w-full h-full flex flex-col">
          {/* Header with controls */}
          <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center p-4 bg-gradient-to-b from-black/50 to-transparent">
            <div className="flex items-center gap-2 text-white">
              <span className="text-lg font-medium">
                {currentIndex + 1} / {images.length}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Zoom controls */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 1}
                aria-label="Zoom out"
              >
                <ZoomOut className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 4}
                aria-label="Zoom in"
              >
                <ZoomIn className="w-5 h-5" />
              </Button>

              {/* Download button */}
              {showDownloadButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={handleDownload}
                  aria-label="Download image"
                >
                  <Download className="w-5 h-5" />
                </Button>
              )}

              {/* Share button */}
              {showShareButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={handleShare}
                  aria-label="Share image"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              )}

              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={onClose}
                aria-label="Close lightbox"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Main image area */}
          <div 
            className="flex-1 flex items-center justify-center p-4 overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <img
              src={currentImage.url}
              alt={currentImage.alt || `Image ${currentIndex + 1} of ${images.length}`}
              className={cn(
                "max-w-full max-h-full object-contain transition-transform duration-200 cursor-pointer",
                isZoomed ? "cursor-zoom-out" : "cursor-zoom-in"
              )}
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center'
              }}
              onClick={toggleZoom}
              draggable={false}
            />
          </div>

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 w-12 h-12"
                onClick={goToPrevious}
                aria-label="Previous image"
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 w-12 h-12"
                onClick={goToNext}
                aria-label="Next image"
              >
                <ChevronRight className="w-8 h-8" />
              </Button>
            </>
          )}

          {/* Bottom area with caption and thumbnails */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
            {/* Caption */}
            {currentImage.caption && (
              <p className="text-white text-center mb-4 max-w-2xl mx-auto">
                {currentImage.caption}
              </p>
            )}

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex justify-center">
                <div className="flex gap-2 overflow-x-auto max-w-md">
                  {images.map((image, index) => (
                    <button
                      key={image.id}
                      className={cn(
                        "flex-shrink-0 w-12 h-12 rounded border-2 transition-all overflow-hidden",
                        currentIndex === index 
                          ? "border-white" 
                          : "border-white/30 hover:border-white/60"
                      )}
                      onClick={() => goToSlide(index)}
                      aria-label={`Go to image ${index + 1}`}
                    >
                      <img
                        src={image.thumbnailUrl || image.url}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};