import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, GripVertical, Upload, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface CarouselImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  alt?: string;
  orderIndex?: number;
  status?: 'pending' | 'uploaded' | 'error';
  progress?: number;
  file?: File;
}

interface MultiImageCarouselProps {
  images: CarouselImage[];
  onRemove?: (id: string) => void;
  onReplace?: (id: string, file: File) => void;
  onReorder?: (newOrder: string[]) => void;
  onCaptionChange?: (id: string, caption: string) => void;
  onAltChange?: (id: string, alt: string) => void;
  initialIndex?: number;
  editable?: boolean;
  showThumbnails?: boolean;
  showPageIndicator?: boolean;
  className?: string;
  maxImages?: number;
}

export const MultiImageCarousel: React.FC<MultiImageCarouselProps> = ({
  images,
  onRemove,
  onReplace,
  onReorder,
  onCaptionChange,
  onAltChange,
  initialIndex = 0,
  editable = false,
  showThumbnails = true,
  showPageIndicator = true,
  className,
  maxImages = 10
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [editingAlt, setEditingAlt] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => prev > 0 ? prev - 1 : images.length - 1);
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => prev < images.length - 1 ? prev + 1 : 0);
  }, [images.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext]);

  // Touch/swipe handling
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    }
    if (isRightSwipe) {
      goToPrevious();
    }
  };

  // Drag and drop for reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!editable) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!editable) return;
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (!editable) return;
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newOrder = [...images];
      const draggedItem = newOrder[draggedIndex];
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(dragOverIndex, 0, draggedItem);
      onReorder?.(newOrder.map(img => img.id));
      
      // Update current index if needed
      if (currentIndex === draggedIndex) {
        setCurrentIndex(dragOverIndex);
      } else if (currentIndex > draggedIndex && currentIndex <= dragOverIndex) {
        setCurrentIndex(currentIndex - 1);
      } else if (currentIndex < draggedIndex && currentIndex >= dragOverIndex) {
        setCurrentIndex(currentIndex + 1);
      }
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleReplace = (id: string) => {
    setReplacingId(id);
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && replacingId) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Only image files are allowed');
        return;
      }
      onReplace?.(replacingId, file);
      setReplacingId(null);
    }
    e.target.value = '';
  };

  const getCurrentOrder = () => images.map(img => img.id);

  if (images.length === 0) {
    return null;
  }

  const currentImage = images[currentIndex];

  return (
    <div 
      className={cn("relative w-full", className)}
      role="region"
      aria-roledescription="carousel"
      aria-label={`Image carousel with ${images.length} images`}
    >
      {/* Hidden file input for replace functionality */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Main image display */}
      <div 
        className="relative aspect-video bg-muted rounded-lg overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <img
          src={currentImage.url}
          alt={currentImage.alt || `Image ${currentIndex + 1} of ${images.length}`}
          className="w-full h-full object-contain"
          loading="lazy"
          role="img"
          aria-roledescription="slide"
          aria-label={`Image ${currentIndex + 1} of ${images.length}${currentImage.caption ? `: ${currentImage.caption}` : ''}`}
        />

        {/* Upload progress overlay */}
        {currentImage.status === 'pending' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mb-2"></div>
              <p>Uploading... {currentImage.progress || 0}%</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {currentImage.status === 'error' && (
          <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
            <div className="text-white text-center">
              <X className="w-16 h-16 mx-auto mb-2" />
              <p>Upload failed</p>
              {editable && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleReplace(currentImage.id)}
                  className="mt-2"
                >
                  Retry
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
              onClick={goToPrevious}
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
              onClick={goToNext}
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </>
        )}

        {/* Page indicator */}
        {showPageIndicator && images.length > 1 && (
          <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        )}

        {/* Edit controls */}
        {editable && (
          <div className="absolute top-4 left-4 flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="bg-black/50 hover:bg-black/70 text-white"
              onClick={() => handleReplace(currentImage.id)}
              aria-label="Replace image"
            >
              <Upload className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="bg-black/50 hover:bg-red-600 text-white"
              onClick={() => onRemove?.(currentImage.id)}
              aria-label="Remove image"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Caption editing */}
      {editable && (
        <div className="mt-2 space-y-2">
          <div>
            <label className="text-sm font-medium">Caption:</label>
            {editingCaption === currentImage.id ? (
              <input
                type="text"
                value={currentImage.caption || ''}
                onChange={(e) => onCaptionChange?.(currentImage.id, e.target.value)}
                onBlur={() => setEditingCaption(null)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingCaption(null)}
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
                placeholder="Add a caption..."
                autoFocus
              />
            ) : (
              <p
                onClick={() => setEditingCaption(currentImage.id)}
                className="cursor-pointer text-sm text-muted-foreground hover:text-foreground mt-1 min-h-[24px] px-2 py-1 border border-transparent hover:border-border rounded"
              >
                {currentImage.caption || 'Add a caption...'}
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Alt text:</label>
            {editingAlt === currentImage.id ? (
              <input
                type="text"
                value={currentImage.alt || ''}
                onChange={(e) => onAltChange?.(currentImage.id, e.target.value)}
                onBlur={() => setEditingAlt(null)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingAlt(null)}
                className="w-full mt-1 px-2 py-1 border rounded text-sm"
                placeholder="Describe this image for accessibility..."
                autoFocus
              />
            ) : (
              <p
                onClick={() => setEditingAlt(currentImage.id)}
                className="cursor-pointer text-sm text-muted-foreground hover:text-foreground mt-1 min-h-[24px] px-2 py-1 border border-transparent hover:border-border rounded"
              >
                {currentImage.alt || 'Add alt text for accessibility...'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Published post caption display */}
      {!editable && currentImage.caption && (
        <p className="mt-2 text-sm text-muted-foreground">{currentImage.caption}</p>
      )}

      {/* Thumbnail strip */}
      {showThumbnails && images.length > 1 && (
        <div className="mt-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {images.map((image, index) => (
              <div
                key={image.id}
                className={cn(
                  "relative flex-shrink-0 w-16 h-16 rounded cursor-pointer border-2 transition-all",
                  currentIndex === index ? "border-primary" : "border-transparent hover:border-border",
                  dragOverIndex === index && "border-blue-500",
                  editable && "group"
                )}
                onClick={() => goToSlide(index)}
                draggable={editable}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                aria-label={`Go to image ${index + 1}`}
              >
                <img
                  src={image.thumbnailUrl || image.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover rounded"
                  loading="lazy"
                />
                
                {/* Loading overlay on thumbnail */}
                {image.status === 'pending' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}

                {/* Error indicator on thumbnail */}
                {image.status === 'error' && (
                  <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center rounded">
                    <X className="w-4 h-4 text-white" />
                  </div>
                )}

                {/* Drag handle */}
                {editable && (
                  <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-background border rounded p-1 cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-3 h-3" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dots indicator for mobile */}
      {!showThumbnails && images.length > 1 && (
        <div className="flex justify-center mt-4 gap-2">
          {images.map((_, index) => (
            <button
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                currentIndex === index ? "bg-primary" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              onClick={() => goToSlide(index)}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Export utility function
export const getCurrentOrder = (carousel: React.RefObject<{ getCurrentOrder?: () => string[] }>) => {
  return carousel.current?.getCurrentOrder?.() || [];
};