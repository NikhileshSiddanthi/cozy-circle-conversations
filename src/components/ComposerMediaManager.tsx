import React, { useState, useEffect, useCallback } from 'react';
import { MultiImageCarousel, CarouselImage } from './MultiImageCarousel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ComposerMediaManagerProps {
  draftId: string;
  onMediaChange?: (mediaCount: number) => void;
  disabled?: boolean;
  maxFiles?: number;
}

export const ComposerMediaManager: React.FC<ComposerMediaManagerProps> = ({
  draftId,
  onMediaChange,
  disabled = false,
  maxFiles = 10
}) => {
  const [images, setImages] = useState<CarouselImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<Map<string, number>>(new Map());
  const { user } = useAuth();

  // Load existing media for the draft
  useEffect(() => {
    if (draftId) {
      loadDraftMedia();
    }
  }, [draftId]);

  const loadDraftMedia = async () => {
    try {
      const response = await supabase.functions.invoke('draft-media', {
        body: {
          action: 'list',
          draftId
        }
      });

      if (response.error) throw response.error;

      const mediaFiles = response.data || [];
      const carouselImages: CarouselImage[] = mediaFiles.map((media: any) => ({
        id: media.fileId || media.id,
        url: media.url,
        thumbnailUrl: media.thumbnailUrl,
        caption: media.caption,
        alt: media.alt,
        orderIndex: media.orderIndex || 0,
        status: media.status === 'uploaded' ? 'uploaded' : 'pending'
      }));

      setImages(carouselImages.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)));
      onMediaChange?.(carouselImages.length);
    } catch (error) {
      console.error('Failed to load draft media:', error);
      toast.error('Failed to load existing media');
    }
  };

  const handleFileSelect = useCallback(async (files: FileList) => {
    if (!user || disabled) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large (max 10MB)`);
        return false;
      }
      if (!file.type.startsWith('image/')) {
        toast.error(`File ${file.name} is not an image`);
        return false;
      }
      return true;
    });

    if (images.length + validFiles.length > maxFiles) {
      toast.error(`Cannot upload more than ${maxFiles} images`);
      return;
    }

    const newImages: CarouselImage[] = validFiles.map((file, index) => ({
      id: `temp-${Date.now()}-${index}`,
      url: URL.createObjectURL(file),
      caption: '',
      alt: '',
      orderIndex: images.length + index,
      status: 'pending' as const,
      progress: 0,
      file
    }));

    setImages(prev => [...prev, ...newImages]);
    setIsUploading(true);

    // Upload files
    for (const image of newImages) {
      if (image.file) {
        await uploadFile(image);
      }
    }

    setIsUploading(false);
    onMediaChange?.(images.length + validFiles.length);
  }, [user, disabled, images.length, maxFiles, onMediaChange]);

  const uploadFile = async (image: CarouselImage) => {
    if (!image.file) return;

    try {
      // Initialize upload
      const initResponse = await supabase.functions.invoke('uploads', {
        body: {
          filename: image.file.name,
          mimeType: image.file.type,
          size: image.file.size,
          draftId
        }
      });

      if (initResponse.error) throw initResponse.error;

      const { uploadId, uploadUrl } = initResponse.data;

      // Upload file to signed URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: image.file,
        headers: {
          'Content-Type': image.file.type
        }
      });

      if (!uploadResponse.ok) throw new Error('Upload failed');

      // Complete upload
      const completeResponse = await supabase.functions.invoke('uploads', {
        body: {
          uploadId
        }
      });

      if (completeResponse.error) throw completeResponse.error;

      const { fileId, url, thumbnailUrl } = completeResponse.data;

      // Update image with server data
      setImages(prev => prev.map(img => 
        img.id === image.id 
          ? { 
              ...img, 
              id: fileId,
              url,
              thumbnailUrl,
              status: 'uploaded' as const,
              progress: 100
            }
          : img
      ));

      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload failed:', error);
      setImages(prev => prev.map(img => 
        img.id === image.id 
          ? { ...img, status: 'error' as const }
          : img
      ));
      toast.error('Upload failed');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const response = await supabase.functions.invoke('draft-media', {
        body: {
          action: 'delete',
          draftId,
          fileId: id
        }
      });

      if (response.error) throw response.error;

      setImages(prev => prev.filter(img => img.id !== id));
      onMediaChange?.(images.length - 1);
      toast.success('Image removed');
    } catch (error) {
      console.error('Failed to remove image:', error);
      toast.error('Failed to remove image');
    }
  };

  const handleReplace = async (id: string, file: File) => {
    const tempId = `temp-${Date.now()}`;
    const tempImage: CarouselImage = {
      id: tempId,
      url: URL.createObjectURL(file),
      caption: '',
      alt: '',
      orderIndex: images.find(img => img.id === id)?.orderIndex || 0,
      status: 'pending',
      progress: 0,
      file
    };

    // Replace image temporarily
    setImages(prev => prev.map(img => img.id === id ? tempImage : img));
    setIsUploading(true);

    try {
      // Remove old image
      await supabase.functions.invoke('draft-media', {
        body: {
          action: 'delete',
          draftId,
          fileId: id
        }
      });

      // Upload new image
      await uploadFile(tempImage);
    } catch (error) {
      console.error('Failed to replace image:', error);
      toast.error('Failed to replace image');
      // Revert on error
      loadDraftMedia();
    }

    setIsUploading(false);
  };

  const handleReorder = async (newOrder: string[]) => {
    try {
      const response = await supabase.functions.invoke('draft-media', {
        body: {
          action: 'reorder',
          draftId,
          order: newOrder
        }
      });

      if (response.error) throw response.error;

      // Update local state to match new order
      const reorderedImages = newOrder.map((id, index) => {
        const image = images.find(img => img.id === id);
        return image ? { ...image, orderIndex: index } : null;
      }).filter(Boolean) as CarouselImage[];

      setImages(reorderedImages);
      toast.success('Images reordered');
    } catch (error) {
      console.error('Failed to reorder images:', error);
      toast.error('Failed to reorder images');
    }
  };

  const handleCaptionChange = async (id: string, caption: string) => {
    try {
      const response = await supabase.functions.invoke('draft-media', {
        body: {
          action: 'update_meta',
          draftId,
          fileId: id,
          caption,
          alt: images.find(img => img.id === id)?.alt || ''
        }
      });

      if (response.error) throw response.error;

      setImages(prev => prev.map(img => 
        img.id === id ? { ...img, caption } : img
      ));
    } catch (error) {
      console.error('Failed to update caption:', error);
      toast.error('Failed to update caption');
    }
  };

  const handleAltChange = async (id: string, alt: string) => {
    try {
      const response = await supabase.functions.invoke('draft-media', {
        body: {
          action: 'update_meta',
          draftId,
          fileId: id,
          caption: images.find(img => img.id === id)?.caption || '',
          alt
        }
      });

      if (response.error) throw response.error;

      setImages(prev => prev.map(img => 
        img.id === id ? { ...img, alt } : img
      ));
    } catch (error) {
      console.error('Failed to update alt text:', error);
      toast.error('Failed to update alt text');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFileSelect(files);
    }
    e.target.value = ''; // Reset input
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files) {
      handleFileSelect(files);
    }
  };

  if (images.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6">
          <div
            className="flex flex-col items-center justify-center space-y-4 text-center"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="rounded-full bg-muted p-4">
              <Upload className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-medium">Upload your media files</h3>
              <p className="text-sm text-muted-foreground">
                Drag and drop images here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Max {maxFiles} images, up to 10MB each
              </p>
            </div>
            <Button
              variant="outline"
              disabled={disabled || isUploading}
              onClick={() => document.getElementById('media-file-input')?.click()}
            >
              Choose Files
            </Button>
            <input
              id="media-file-input"
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <MultiImageCarousel
        images={images}
        onRemove={handleRemove}
        onReplace={handleReplace}
        onReorder={handleReorder}
        onCaptionChange={handleCaptionChange}
        onAltChange={handleAltChange}
        editable={true}
        showThumbnails={true}
        showPageIndicator={true}
        maxImages={maxFiles}
      />
      
      {images.length < maxFiles && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            disabled={disabled || isUploading}
            onClick={() => document.getElementById('media-file-input')?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Add More Images ({images.length}/{maxFiles})
          </Button>
          <input
            id="media-file-input"
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      )}

      {isUploading && (
        <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          <span>Uploading images...</span>
        </div>
      )}
    </div>
  );
};