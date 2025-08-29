import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image, Video, File, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MediaUploadProps {
  onFileUploaded: (url: string, type: string) => void;
  onFileRemoved: () => void;
  acceptedTypes?: string[];
  maxSize?: number; // in MB
  currentFile?: { url: string; type: string } | null;
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

export const MediaUpload: React.FC<MediaUploadProps> = ({
  onFileUploaded,
  onFileRemoved,
  acceptedTypes = ['image/*', 'video/*'],
  maxSize = 10, // 10MB default
  currentFile,
}) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File) => {
    if (!user) {
      setError('You must be logged in to upload files');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const { data, error } = await supabase.storage
        .from('post-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('post-media')
        .getPublicUrl(data.path);

      onFileUploaded(publicUrl, file.type);
      
    } catch (error) {
      console.error('Upload failed:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [user, onFileUploaded]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      return;
    }

    uploadFile(file);
  }, [uploadFile, maxSize]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => {
      acc[type] = ACCEPTED_TYPES[type as keyof typeof ACCEPTED_TYPES] || [];
      return acc;
    }, {} as Record<string, string[]>),
    multiple: false,
    disabled: uploading,
  });

  const removeFile = useCallback(async () => {
    if (currentFile?.url && user) {
      // Extract file path from URL
      const urlParts = currentFile.url.split('/');
      const fileName = `${user.id}/${urlParts[urlParts.length - 1]}`;
      
      try {
        await supabase.storage.from('post-media').remove([fileName]);
      } catch (error) {
        console.error('Failed to remove file:', error);
      }
    }
    
    onFileRemoved();
    setError(null);
  }, [currentFile, user, onFileRemoved]);

  // Display current file
  if (currentFile) {
    const IconComponent = getFileIcon(currentFile.type);
    
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <IconComponent className="h-8 w-8 text-gray-400" />
            <div>
              <p className="text-sm font-medium">Media uploaded</p>
              <p className="text-xs text-gray-500">{currentFile.type}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={removeFile}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {currentFile.type.startsWith('image/') && (
          <div className="mt-3">
            <img 
              src={currentFile.url} 
              alt="Uploaded media" 
              className="max-w-full h-32 object-cover rounded"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <input {...getInputProps()} />
        
        {!uploading ? (
          <div className="space-y-2">
            <Upload className="mx-auto h-8 w-8 text-gray-400" />
            <div>
              <p className="text-sm font-medium">
                {isDragActive ? 'Drop your file here' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-gray-500">
                Images and videos up to {maxSize}MB
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="mx-auto h-8 w-8 text-primary animate-pulse" />
            <div>
              <p className="text-sm font-medium">Uploading...</p>
              <Progress value={progress} className="mt-2" />
              <p className="text-xs text-gray-500 mt-1">{progress}%</p>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {(error || fileRejections.length > 0) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || fileRejections[0]?.errors[0]?.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};