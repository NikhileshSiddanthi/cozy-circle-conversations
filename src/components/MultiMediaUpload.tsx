import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image, Video, File, AlertCircle, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface MultiMediaUploadProps {
  onFilesUploaded: (urls: string[]) => void;
  maxFiles?: number;
  maxSize?: number; // in MB
  currentFiles?: string[];
}

interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
  url?: string;
  error?: string;
}

const ACCEPTED_TYPES = {
  'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
  'video/*': ['.mp4', '.webm', '.ogg', '.mov'],
};

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return Image;
  if (type.startsWith('video/')) return Video;
  return File;
};

export const MultiMediaUpload: React.FC<MultiMediaUploadProps> = ({
  onFilesUploaded,
  maxFiles = 10,
  maxSize = 100, // 100MB default
  currentFiles = [],
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    if (!user) {
      throw new Error('You must be logged in to upload files');
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('post-files')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('post-files')
      .getPublicUrl(data.path);

    return publicUrl;
  }, [user]);

  const processFiles = useCallback(async (files: File[]) => {
    if (!user) {
      setGlobalError('You must be logged in to upload files');
      return;
    }

    if (currentFiles.length + files.length > maxFiles) {
      setGlobalError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setGlobalError(null);

    // Initialize upload progress for all files
    const newUploads: UploadProgress[] = files.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const
    }));

    setUploads(prev => [...prev, ...newUploads]);

    // Process each file
    const uploadPromises = files.map(async (file, index) => {
      try {
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploads(prev => prev.map((upload, i) => 
            upload.file === file 
              ? { ...upload, progress: Math.min(upload.progress + 10, 90) }
              : upload
          ));
        }, 200);

        const url = await uploadFile(file);
        
        clearInterval(progressInterval);
        
        setUploads(prev => prev.map(upload => 
          upload.file === file 
            ? { ...upload, progress: 100, status: 'complete', url }
            : upload
        ));

        return url;
      } catch (error) {
        setUploads(prev => prev.map(upload => 
          upload.file === file 
            ? { 
                ...upload, 
                status: 'error', 
                error: error instanceof Error ? error.message : 'Upload failed',
                progress: 0
              }
            : upload
        ));
        return null;
      }
    });

    // Wait for all uploads to complete
    const results = await Promise.all(uploadPromises);
    const successfulUploads = results.filter((url): url is string => url !== null);
    
    if (successfulUploads.length > 0) {
      onFilesUploaded([...currentFiles, ...successfulUploads]);
      toast({
        title: "Upload Complete",
        description: `${successfulUploads.length} file(s) uploaded successfully`,
      });
    }

    if (results.some(result => result === null)) {
      toast({
        title: "Some uploads failed",
        description: "Please check the files and try again",
        variant: "destructive",
      });
    }
  }, [user, uploadFile, onFilesUploaded, currentFiles, maxFiles, toast]);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Validate file sizes
    const validFiles = acceptedFiles.filter(file => {
      if (file.size > maxSize * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds ${maxSize}MB limit`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    if (rejectedFiles.length > 0) {
      toast({
        title: "Invalid files",
        description: "Some files were rejected due to invalid format",
        variant: "destructive",
      });
    }

    if (validFiles.length > 0) {
      processFiles(validFiles);
    }
  }, [processFiles, maxSize, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: true,
    disabled: uploads.some(u => u.status === 'uploading'),
  });

  const removeFile = useCallback(async (url: string) => {
    // Remove from current files
    const newFiles = currentFiles.filter(f => f !== url);
    onFilesUploaded(newFiles);

    // Remove from storage if possible
    if (user) {
      try {
        const urlParts = url.split('/');
        const fileName = `${user.id}/${urlParts[urlParts.length - 1]}`;
        await supabase.storage.from('post-files').remove([fileName]);
      } catch (error) {
        console.error('Failed to remove file from storage:', error);
      }
    }
  }, [currentFiles, onFilesUploaded, user]);

  const removeUpload = useCallback((file: File) => {
    setUploads(prev => prev.filter(upload => upload.file !== file));
  }, []);

  const retryUpload = useCallback((file: File) => {
    processFiles([file]);
  }, [processFiles]);

  const canAddMore = currentFiles.length + uploads.filter(u => u.status === 'complete').length < maxFiles;
  const isUploading = uploads.some(u => u.status === 'uploading');

  return (
    <div className="space-y-4">
      {/* Current Files */}
      {currentFiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {currentFiles.map((url, index) => (
            <div key={url} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-muted border border-border/50">
                <img 
                  src={url} 
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeFile(url)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((upload, index) => (
            <div key={`${upload.file.name}-${index}`} className="p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {React.createElement(getFileIcon(upload.file.type), { 
                    className: "h-4 w-4" 
                  })}
                  <span className="text-sm font-medium truncate">{upload.file.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {upload.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {upload.status === 'complete' && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                  {upload.status === 'error' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => retryUpload(upload.file)}
                      className="text-destructive hover:text-destructive"
                    >
                      Retry
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeUpload(upload.file)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {upload.status === 'uploading' && (
                <Progress value={upload.progress} className="h-1" />
              )}
              
              {upload.status === 'error' && (
                <p className="text-xs text-destructive mt-1">{upload.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      {canAddMore && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-border/50 hover:border-border'
          } ${isUploading ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          <input {...getInputProps()} />
          
          <div className="space-y-2">
            <div className="flex justify-center">
              {currentFiles.length > 0 ? (
                <Plus className="h-8 w-8 text-muted-foreground" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">
                {isDragActive 
                  ? 'Drop your files here' 
                  : currentFiles.length > 0
                    ? 'Add more files'
                    : 'Click to upload or drag and drop'
                }
              </p>
              <p className="text-xs text-muted-foreground">
                Images and videos up to {maxSize}MB ({currentFiles.length}/{maxFiles} files)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Global Error */}
      {globalError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{globalError}</AlertDescription>
        </Alert>
      )}
      
      {!canAddMore && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Maximum number of files ({maxFiles}) reached.</AlertDescription>
        </Alert>
      )}
    </div>
  );
};