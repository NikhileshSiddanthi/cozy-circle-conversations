import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Video, 
  AlertCircle,
  Loader2,
  RotateCcw,
  GripVertical,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface MediaFile {
  id: string;
  file: File;
  preview: string;
  status: 'uploading' | 'completed' | 'error';
  progress: number;
  url?: string;
  error?: string;
}

interface MediaUploadProps {
  files: string[];
  onFilesChange: (files: string[]) => void;
  onUploadStatusChange?: (uploading: boolean) => void;
  maxFiles?: number;
  disabled?: boolean;
  draftId?: string | null;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  files,
  onFilesChange,
  onUploadStatusChange,
  maxFiles = 10,
  disabled = false,
  draftId
}) => {
  const { toast } = useToast();
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ACCEPTED_TYPES = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'video/mp4': ['.mp4'],
    'video/webm': ['.webm'],
  };

  // Initialize with existing files
  useEffect(() => {
    if (files.length > 0) {
      const existingFiles: MediaFile[] = files.map((url, index) => ({
        id: `existing-${index}`,
        file: new File([''], 'existing-file', { type: 'image/jpeg' }),
        preview: url,
        status: 'completed' as const,
        progress: 100,
        url: url
      }));
      setMediaFiles(existingFiles);
    } else {
      setMediaFiles([]);
    }
  }, [files.join(',')]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      mediaFiles.forEach(file => {
        if (file.preview.startsWith('blob:')) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, []);

  const checkUploadStatus = useCallback((updatedFiles: MediaFile[]) => {
    const uploading = updatedFiles.some(f => f.status === 'uploading');
    onUploadStatusChange?.(uploading);
  }, [onUploadStatusChange]);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" is too large. Maximum size is 10MB.`;
    }

    if (!Object.keys(ACCEPTED_TYPES).includes(file.type)) {
      return `File "${file.name}" has an unsupported format. Please use JPEG, PNG, GIF, WebP, MP4, or WebM.`;
    }

    return null;
  };

  const uploadFile = useCallback(async (mediaFile: MediaFile): Promise<void> => {
    console.log(`🎬 uploadFile started for: ${mediaFile.file.name} (${mediaFile.id})`);
    
    try {
      if (!draftId) {
        throw new Error('No draft ID available for upload');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log(`📤 Step 1 - Initializing upload for: ${mediaFile.file.name}`);

      // Update progress
      setMediaFiles(prev => {
        const updated = prev.map(f => 
          f.id === mediaFile.id 
            ? { ...f, progress: 10, status: 'uploading' as const }
            : f
        );
        checkUploadStatus(updated);
        return updated;
      });

      console.log('MediaUpload: Initiating upload for:', mediaFile.file.name, 'draftId:', draftId);

      // Step 1: Initialize upload
      const { data: initData, error: initError } = await supabase.functions.invoke('uploads', {
        body: {
          filename: mediaFile.file.name,
          mimeType: mediaFile.file.type,
          size: mediaFile.file.size,
          draftId: draftId
        }
      });

      if (initError) {
        console.error(`❌ Upload init error for ${mediaFile.file.name}:`, initError);
        throw new Error(initError.message || 'Failed to initialize upload');
      }

      console.log(`✅ Step 1 complete - Upload initialized for ${mediaFile.file.name}:`, initData);

      // Update progress
      setMediaFiles(prev => {
        const updated = prev.map(f => 
          f.id === mediaFile.id 
            ? { ...f, progress: 25 }
            : f
        );
        checkUploadStatus(updated);
        return updated;
      });

      console.log(`📤 Step 2 - Uploading file to storage: ${mediaFile.file.name}`);

      // Step 2: Upload file to signed URL
      const uploadResponse = await fetch(initData.uploadUrl, {
        method: 'PUT',
        body: mediaFile.file,
        headers: {
          'Content-Type': mediaFile.file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      console.log(`✅ Step 2 complete - File uploaded to storage successfully: ${mediaFile.file.name}`);

      // Update progress
      setMediaFiles(prev => {
        const updated = prev.map(f => 
          f.id === mediaFile.id 
            ? { ...f, progress: 75 }
            : f
        );
        checkUploadStatus(updated);
        return updated;
      });

      console.log(`📤 Step 3 - Completing upload: ${mediaFile.file.name}`);

      // Step 3: Complete upload
      const { data: completeData, error: completeError } = await supabase.functions.invoke('uploads', {
        body: {
          uploadId: initData.uploadId
        }
      });

      if (completeError) {
        console.error(`❌ Upload complete error for ${mediaFile.file.name}:`, completeError);
        throw new Error(completeError.message || 'Failed to complete upload');
      }

      console.log(`✅ Step 3 complete - Upload completed for ${mediaFile.file.name}:`, completeData);

      // Update to completed
      setMediaFiles(prev => {
        const updated = prev.map(f => 
          f.id === mediaFile.id 
            ? { 
                ...f, 
                progress: 100, 
                status: 'completed' as const, 
                url: completeData.url,
                preview: completeData.url
              }
            : f
        );
        checkUploadStatus(updated);
        return updated;
      });

      // Revoke blob URL
      if (mediaFile.preview.startsWith('blob:')) {
        URL.revokeObjectURL(mediaFile.preview);
      }

      // Update parent with new file
      if (!files.includes(completeData.url)) {
        console.log(`📋 Adding ${mediaFile.file.name} to parent files list`);
        onFilesChange([...files, completeData.url]);
      }

      toast({
        title: "Upload Successful",
        description: `${mediaFile.file.name} has been uploaded.`,
      });

      console.log(`🎉 Upload workflow complete for: ${mediaFile.file.name}`);

    } catch (error) {
      console.error(`❌ Upload failed for ${mediaFile.file.name}:`, error);
      
      setMediaFiles(prev => {
        const updated = prev.map(f => 
          f.id === mediaFile.id 
            ? { 
                ...f, 
                status: 'error' as const, 
                error: error instanceof Error ? error.message : 'Upload failed'
              }
            : f
        );
        checkUploadStatus(updated);
        return updated;
      });

      toast({
        title: "Upload Failed",
        description: `Failed to upload ${mediaFile.file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  }, [draftId, files, onFilesChange, toast, checkUploadStatus]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log('🎯 MediaUpload onDrop called with files:', acceptedFiles.length, acceptedFiles.map(f => f.name));
    
    if (disabled) {
      console.log('❌ Upload disabled, ignoring drop');
      return;
    }
    
    if (!draftId) {
      console.log('❌ No draftId available');
      toast({
        title: "Draft Initializing",
        description: "Please wait for the draft to be created before uploading files.",
        variant: "destructive"
      });
      return;
    }
    
    console.log('📊 Current mediaFiles count:', mediaFiles.length);
    const currentFileCount = mediaFiles.filter(f => f.status !== 'error').length;
    const totalAfterUpload = currentFileCount + acceptedFiles.length;
    
    console.log('📈 Files after upload would be:', totalAfterUpload, 'max allowed:', maxFiles);
    
    if (totalAfterUpload > maxFiles) {
      toast({
        title: "Too Many Files",
        description: `You can only upload up to ${maxFiles} files. You currently have ${currentFileCount} files.`,
        variant: "destructive"
      });
      return;
    }

    const validFiles: File[] = [];
    const errors: string[] = [];

    acceptedFiles.forEach((file, index) => {
      console.log(`🔍 Validating file ${index + 1}:`, file.name, file.type, file.size);
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    console.log('✅ Valid files:', validFiles.length, '❌ Invalid files:', errors.length);

    if (errors.length > 0) {
      toast({
        title: "Invalid Files",
        description: errors.join(' '),
        variant: "destructive"
      });
    }

    if (validFiles.length === 0) {
      console.log('❌ No valid files to upload');
      return;
    }

    const newMediaFiles: MediaFile[] = validFiles.map((file, index) => {
      const mediaFile = {
        id: `${Date.now()}-${index}-${Math.random().toString(36).substring(2)}`,
        file,
        preview: URL.createObjectURL(file),
        status: 'uploading' as const,
        progress: 0
      };
      console.log('📦 Created MediaFile:', mediaFile.id, 'for', file.name);
      return mediaFile;
    });

    console.log('🚀 Adding', newMediaFiles.length, 'new files to state');
    
    setMediaFiles(prev => {
      const updated = [...prev, ...newMediaFiles];
      console.log('📝 Updated mediaFiles state:', updated.length, 'total files');
      checkUploadStatus(updated);
      return updated;
    });

    // Start uploads for each file
    console.log('⬆️ Starting uploads for', newMediaFiles.length, 'files');
    newMediaFiles.forEach((mediaFile, index) => {
      console.log(`🎬 Starting upload ${index + 1}/${newMediaFiles.length} for:`, mediaFile.file.name);
      uploadFile(mediaFile);
    });

  }, [mediaFiles, files, maxFiles, disabled, draftId, toast, onFilesChange, checkUploadStatus, uploadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: maxFiles,
    multiple: true,
    disabled: disabled || !draftId,
    onDropAccepted: (files) => {
      console.log('✅ Dropzone onDropAccepted:', files.length, 'files accepted');
    },
    onDropRejected: (fileRejections) => {
      console.log('❌ Dropzone onDropRejected:', fileRejections.length, 'files rejected');
      fileRejections.forEach((rejection, index) => {
        console.log(`Rejection ${index + 1}:`, rejection.file.name, rejection.errors.map(e => e.message));
      });
    }
  });

  const removeFile = async (fileId: string) => {
    const fileToRemove = mediaFiles.find(f => f.id === fileId);
    
    if (fileToRemove?.url && !fileToRemove.id.startsWith('existing-') && draftId) {
      try {
        // Delete from draft_media
        const { error } = await supabase
          .from('draft_media')
          .delete()
          .eq('draft_id', draftId)
          .eq('url', fileToRemove.url);
          
        if (error) {
          console.warn('Failed to remove file from draft_media:', error);
        }
      } catch (error) {
        console.warn('Failed to remove file from database:', error);
      }
    }
    
    // Remove from files list
    if (fileToRemove?.url) {
      onFilesChange(files.filter(url => url !== fileToRemove.url));
    }
    
    // Revoke preview URL
    if (fileToRemove?.preview.startsWith('blob:')) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    
    setMediaFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      checkUploadStatus(updated);
      return updated;
    });
  };

  const retryUpload = (fileId: string) => {
    const mediaFile = mediaFiles.find(f => f.id === fileId);
    if (mediaFile && mediaFile.status === 'error') {
      setMediaFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: 'uploading' as const, progress: 0, error: undefined }
          : f
      ));
      uploadFile(mediaFile);
    }
  };

  const reorderFiles = (fromIndex: number, toIndex: number) => {
    const newFiles = [...files];
    const [removed] = newFiles.splice(fromIndex, 1);
    newFiles.splice(toIndex, 0, removed);
    onFilesChange(newFiles);
    
    // Update mediaFiles order to match
    const newMediaFiles = [...mediaFiles];
    const [removedMedia] = newMediaFiles.splice(fromIndex, 1);
    newMediaFiles.splice(toIndex, 0, removedMedia);
    setMediaFiles(newMediaFiles);
  };

  const activeFiles = mediaFiles.filter(f => f.status !== 'error');
  const canAddMore = activeFiles.length < maxFiles;
  const imageFiles = mediaFiles.filter(f => f.file.type.startsWith('image/') && f.status === 'completed');

  const openViewer = (index: number) => {
    const imageIndex = imageFiles.findIndex(img => img.id === mediaFiles[index].id);
    if (imageIndex !== -1) {
      setCurrentImageIndex(imageIndex);
      setViewerOpen(true);
    }
  };

  const navigateImage = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      setCurrentImageIndex((prev) => (prev + 1) % imageFiles.length);
    } else {
      setCurrentImageIndex((prev) => (prev - 1 + imageFiles.length) % imageFiles.length);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {canAddMore && (
        <Card>
          <CardContent className="p-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : disabled
                  ? 'border-muted-foreground/20 bg-muted/20 cursor-not-allowed'
                  : !draftId
                  ? 'border-orange-300 bg-orange-50'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
              }`}
            >
              <input {...getInputProps()} disabled={!draftId} data-testid="media-file-input" />
              <Upload className={`h-8 w-8 mx-auto mb-4 ${disabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`} />
              
              {!draftId ? (
                <>
                  <p className="text-lg font-medium text-orange-600 mb-2">
                    <Loader2 className="h-4 w-4 inline animate-spin mr-2" />
                    Initializing draft...
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Please wait while we prepare your post
                  </p>
                </>
              ) : isDragActive ? (
                <p className="text-lg font-medium text-primary mb-2">
                  Drop your files here...
                </p>
              ) : (
                <>
                  <p className={`text-lg font-medium mb-2 ${disabled ? 'text-muted-foreground/50' : ''}`}>
                    Upload your media files
                  </p>
                  <p className={`text-sm text-muted-foreground mb-4 ${disabled ? 'opacity-50' : ''}`}>
                    Drag & drop files here, or click to select <strong>multiple files</strong>
                  </p>
                </>
              )}
              
              <div className={`flex flex-wrap justify-center gap-4 text-xs text-muted-foreground ${disabled ? 'opacity-50' : ''}`}>
                <span>• Max {maxFiles} files</span>
                <span>• Up to 10MB each</span>
                <span>• JPEG, PNG, GIF, WebP, MP4, WebM</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File List */}
      {mediaFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Media Files ({activeFiles.length}/{maxFiles})</h4>
          
          {mediaFiles.map((mediaFile, index) => (
            <Card key={mediaFile.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Drag Handle */}
                  <div className="mt-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  </div>
                  
                   {/* File Preview */}
                   <div className="flex-shrink-0">
                     {mediaFile.file.type.startsWith('image/') ? (
                       <img
                         src={mediaFile.preview}
                         alt={mediaFile.file.name}
                         className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                         onClick={() => openViewer(index)}
                       />
                     ) : mediaFile.file.type.startsWith('video/') ? (
                       <video
                         src={mediaFile.preview}
                         className="w-16 h-16 object-cover rounded"
                         muted
                       />
                     ) : (
                       <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                         <ImageIcon className="h-5 w-5" />
                       </div>
                     )}
                   </div>
                  
                  {/* File Info */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm truncate">
                        {mediaFile.file.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(mediaFile.id)}
                        className="h-6 w-6 p-0 hover:bg-destructive/10"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="text-xs text-muted-foreground mb-2">
                      {(mediaFile.file.size / 1024 / 1024).toFixed(1)} MB
                    </div>
                    
                    {/* Progress/Status */}
                    {mediaFile.status === 'uploading' && (
                      <div className="space-y-1">
                        <Progress value={mediaFile.progress} className="h-2" />
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Uploading... {mediaFile.progress}%
                        </div>
                      </div>
                    )}
                    
                    {mediaFile.status === 'completed' && (
                      <div className="flex items-center text-xs text-green-600">
                        ✓ Upload complete
                      </div>
                    )}
                    
                    {mediaFile.status === 'error' && (
                      <div className="space-y-2">
                        <div className="flex items-center text-xs text-destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {mediaFile.error}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => retryUpload(mediaFile.id)}
                          className="h-6 text-xs"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Retry
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Image Viewer Modal */}
      {imageFiles.length > 0 && (
        <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle>
                Image {currentImageIndex + 1} of {imageFiles.length} - {imageFiles[currentImageIndex]?.file.name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="relative flex items-center justify-center p-6 pt-2">
              {imageFiles.length > 1 && (
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
                  onClick={() => navigateImage('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              
              <img
                src={imageFiles[currentImageIndex]?.preview}
                alt={imageFiles[currentImageIndex]?.file.name}
                className="max-w-full max-h-[60vh] object-contain rounded"
              />
              
              {imageFiles.length > 1 && (
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10"
                  onClick={() => navigateImage('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {imageFiles.length > 1 && (
              <div className="px-6 pb-6">
                <div className="flex gap-2 justify-center overflow-x-auto">
                  {imageFiles.map((img, idx) => (
                    <img
                      key={img.id}
                      src={img.preview}
                      alt={img.file.name}
                      className={`w-12 h-12 object-cover rounded cursor-pointer transition-all ${
                        idx === currentImageIndex 
                          ? 'ring-2 ring-primary opacity-100' 
                          : 'opacity-60 hover:opacity-80'
                      }`}
                      onClick={() => setCurrentImageIndex(idx)}
                    />
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Tips */}
      {mediaFiles.length === 0 && (
        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
          <p className="font-medium mb-2">Tips:</p>
          <ul className="space-y-1">
            <li>• Images and videos will be optimized for best performance</li>
            <li>• You can reorder files by dragging them</li>
            <li>• Files are uploaded immediately and can be removed before posting</li>
            <li>• Click on image thumbnails to view them full-size</li>
          </ul>
        </div>
      )}
    </div>
  );
};