import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Video, 
  FileText, 
  AlertCircle,
  Loader2,
  RotateCcw
} from 'lucide-react';

interface MediaFile {
  id: string;
  file: File;
  preview: string;
  status: 'uploading' | 'completed' | 'error';
  progress: number;
  url?: string;
  error?: string;
  serverId?: string;
}

interface EnhancedMediaUploadProps {
  files: string[];
  onFilesChange: (files: string[]) => void;
  onUploadStatusChange?: (uploading: boolean) => void;
  groupId?: string;
  userId?: string;
  draftId?: string;
  disabled?: boolean;
  isWorkingMode?: boolean;
}

export const EnhancedMediaUpload: React.FC<EnhancedMediaUploadProps> = ({
  files,
  onFilesChange,
  onUploadStatusChange,
  groupId,
  userId,
  draftId,
  disabled = false,
  isWorkingMode = false
}) => {
  const { toast } = useToast();
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_FILES = 10; // Allow up to 10 files
  const ACCEPTED_TYPES = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'video/mp4': ['.mp4'],
    'video/webm': ['.webm'],
  };

  // Sync with existing files from parent
  useEffect(() => {
    if (files.length > 0) {
      const existingFiles: MediaFile[] = files.map((url, index) => ({
        id: `existing-${index}`,
        file: new File([''], 'existing-file', { type: 'image/jpeg' }),
        preview: url,
        status: 'completed' as const,
        progress: 100,
        url: url,
        serverId: `existing-${index}`
      }));
      setMediaFiles(existingFiles);
    }
  }, [files.length === 0 ? 0 : files.join(',')]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      mediaFiles.forEach(file => {
        if (file.preview.startsWith('blob:')) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, []);

  // Debug logging for props
  useEffect(() => {
    console.log('EnhancedMediaUpload props:', { 
      draftId, 
      userId, 
      groupId, 
      filesCount: files.length,
      disabled 
    });
  }, [draftId, userId, groupId, files.length, disabled]);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" is too large. Maximum size is 10MB.`;
    }

    if (!Object.keys(ACCEPTED_TYPES).includes(file.type)) {
      return `File "${file.name}" has an unsupported format. Please use JPEG, PNG, GIF, WebP, MP4, or WebM.`;
    }

    return null;
  };

  const checkAllUploadsComplete = useCallback((updatedFiles: MediaFile[]) => {
    const allDone = updatedFiles.every(f => f.status === 'completed' || f.status === 'error');
    if (allDone) {
      onUploadStatusChange?.(false);
    }
  }, [onUploadStatusChange]);

  const uploadFile = async (mediaFile: MediaFile): Promise<void> => {
    console.log('Upload attempt:', { draftId, userId, groupId, isWorkingMode });
    
    if (!draftId || !userId) {
      console.error('Missing required params:', { draftId, userId });
      setMediaFiles(prev => {
        const updatedFiles = prev.map(f => 
          f.id === mediaFile.id 
            ? { ...f, status: 'error' as const, error: `Missing required information` }
            : f
        );
        checkAllUploadsComplete(updatedFiles);
        return updatedFiles;
      });
      return;
    }

    // For working mode or fallback drafts, use local preview only
    if (isWorkingMode || draftId.startsWith('working_') || draftId.startsWith('local_') || draftId.startsWith('fallback_')) {
      console.log('Working mode - using local preview only');
      setMediaFiles(prev => {
        const updatedFiles = prev.map(f => 
          f.id === mediaFile.id 
            ? { 
                ...f, 
                progress: 100, 
                status: 'completed' as const, 
                url: f.preview, // Use preview URL as final URL
                serverId: `preview_${f.id}`
              }
            : f
        );
        checkAllUploadsComplete(updatedFiles);
        return updatedFiles;
      });
      
      // Add to files list for local preview
      if (!files.includes(mediaFile.preview)) {
        onFilesChange([...files, mediaFile.preview]);
      }
      
      toast({
        title: "File Ready",
        description: `${mediaFile.file.name} is ready for posting.`,
      });
      
      return;
    }

    try {
      const fileExt = mediaFile.file.name.split('.').pop();
      const fileName = `${userId}_${groupId || 'group'}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Update progress
      setMediaFiles(prev => prev.map(f => 
        f.id === mediaFile.id 
          ? { ...f, progress: 10, status: 'uploading' as const }
          : f
      ));

      // Upload to storage
      const { data, error } = await supabase.storage
        .from('post-files')
        .upload(filePath, mediaFile.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('post-files')
        .getPublicUrl(filePath);

      setMediaFiles(prev => prev.map(f => 
        f.id === mediaFile.id 
          ? { ...f, progress: 50 }
          : f
      ));

      // Register with draft via edge function
      const response = await fetch(`https://zsquagqhilzjumfjxusk.supabase.co/functions/v1/media-upload/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcXVhZ3FoaWx6anVtZmp4dXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMjA5MDMsImV4cCI6MjA2OTY5NjkwM30.HF6dfD8LhicG73SMomqcZO-8DD5GN9YPX8W6sh4DcFI',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          draftId,
          fileId: filePath,
          url: publicUrlData.publicUrl,
          mimeType: mediaFile.file.type,
          fileSize: mediaFile.file.size
        })
      });

      if (!response.ok) {
        await supabase.storage.from('post-files').remove([filePath]);
        throw new Error(`Failed to register media: ${response.statusText}`);
      }

      const mediaResult = await response.json();

      // Replace preview with server URL and mark as completed
      setMediaFiles(prev => {
        const updatedFiles = prev.map(f => 
          f.id === mediaFile.id 
            ? { 
                ...f, 
                progress: 100, 
                status: 'completed' as const, 
                url: publicUrlData.publicUrl,
                serverId: mediaResult.id,
                preview: publicUrlData.publicUrl // Replace blob URL with server URL
              }
            : f
        );
        checkAllUploadsComplete(updatedFiles);
        return updatedFiles;
      });

      // Revoke the original object URL since we now have server URL
      if (mediaFile.preview.startsWith('blob:')) {
        URL.revokeObjectURL(mediaFile.preview);
      }

      // Add to files list - only add if not already present
      if (!files.includes(publicUrlData.publicUrl)) {
        onFilesChange([...files, publicUrlData.publicUrl]);
      }

      toast({
        title: "Upload Successful",
        description: `${mediaFile.file.name} has been uploaded.`,
      });

    } catch (error) {
      console.error('Upload failed:', error);
      
      setMediaFiles(prev => {
        const updatedFiles = prev.map(f => 
          f.id === mediaFile.id 
            ? { 
                ...f, 
                status: 'error' as const, 
                error: error instanceof Error ? error.message : 'Upload failed'
              }
            : f
        );
        checkAllUploadsComplete(updatedFiles);
        return updatedFiles;
      });

      toast({
        title: "Upload Failed",
        description: `Failed to upload ${mediaFile.file.name}. Please try again.`,
        variant: "destructive"
      });
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (disabled) return;
    
    const currentFileCount = mediaFiles.filter(f => f.status !== 'error').length;
    const totalAfterUpload = currentFileCount + acceptedFiles.length;
    
    if (totalAfterUpload > MAX_FILES) {
      toast({
        title: "Too Many Files",
        description: `You can only upload up to ${MAX_FILES} files. You currently have ${currentFileCount} files, trying to add ${acceptedFiles.length} more.`,
        variant: "destructive"
      });
      return;
    }

    const validFiles: File[] = [];
    const errors: string[] = [];

    acceptedFiles.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      toast({
        title: "Invalid Files",
        description: errors.join(' '),
        variant: "destructive"
      });
    }

    if (validFiles.length === 0) return;

    console.log('Current mediaFiles:', mediaFiles.length, 'Current files from parent:', files.length);
    
    // Notify parent that upload is starting
    onUploadStatusChange?.(true);
    
    const newMediaFiles: MediaFile[] = validFiles.map(file => ({
      id: Math.random().toString(36).substring(2),
      file,
      preview: URL.createObjectURL(file), // Immediate preview with blob URL
      status: 'uploading' as const,
      progress: 0
    }));

    setMediaFiles(prev => [...prev, ...newMediaFiles]);

    // Start uploads
    newMediaFiles.forEach(mediaFile => {
      uploadFile(mediaFile);
    });

  }, [mediaFiles.length, files, onFilesChange, onUploadStatusChange, disabled, draftId, userId, groupId, toast, checkAllUploadsComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: MAX_FILES,
    multiple: true,
    disabled
  });

  const removeFile = async (fileId: string) => {
    const fileToRemove = mediaFiles.find(f => f.id === fileId);
    
    if (fileToRemove?.url && fileToRemove?.serverId && draftId) {
      try {
        // Remove from server - only if it has a real serverId (not existing files)
        if (!fileToRemove.serverId?.startsWith('existing-')) {
          await fetch(`https://zsquagqhilzjumfjxusk.supabase.co/functions/v1/media-upload/${fileToRemove.serverId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcXVhZ3FoaWx6anVtZmp4dXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMjA5MDMsImV4cCI6MjA2OTY5NjkwM30.HF6dfD8LhicG73SMomqcZO-8DD5GN9YPX8W6sh4DcFI',
            },
          });
        }
        
        // Remove from files list
        onFilesChange(files.filter(url => url !== fileToRemove.url));
      } catch (error) {
        console.warn('Failed to remove media from server:', error);
      }
    }
    
    // Revoke preview URL
    if (fileToRemove?.preview.startsWith('blob:')) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    
    setMediaFiles(prev => prev.filter(f => f.id !== fileId));
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

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5" />;
    } else if (file.type.startsWith('video/')) {
      return <Video className="h-5 w-5" />;
    }
    return <FileText className="h-5 w-5" />;
  };

  const activeFiles = mediaFiles.filter(f => f.status !== 'error');
  const canAddMore = activeFiles.length < MAX_FILES;

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {canAddMore && (
        <Card>
          <CardContent className="p-6">
            {isWorkingMode ? (
              <div className="border-2 border-dashed border-blue-200 rounded-lg p-8 text-center bg-blue-50">
                <Upload className="h-8 w-8 mx-auto mb-4 text-blue-600" />
                <p className="text-lg font-medium mb-2 text-blue-800">
                  Add media files (Preview Mode)
                </p>
                <p className="text-sm text-blue-600 mb-4">
                  Files will be previewed locally and included in your post
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  Select Files
                </Button>
                <input {...getInputProps()} style={{ display: 'none' }} />
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : disabled
                    ? 'border-muted-foreground/20 bg-muted/20 cursor-not-allowed'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className={`h-8 w-8 mx-auto mb-4 ${disabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`} />
                
                {isDragActive ? (
                  <p className="text-lg font-medium text-primary mb-2">
                    Drop your files here...
                  </p>
                ) : (
                  <>
                    <p className={`text-lg font-medium mb-2 ${disabled ? 'text-muted-foreground/50' : ''}`}>
                      Upload your media files
                    </p>
                    <p className={`text-sm text-muted-foreground mb-4 ${disabled ? 'opacity-50' : ''}`}>
                      Drag & drop files here, or click to select files
                    </p>
                  </>
                )}
                
                <div className={`flex flex-wrap justify-center gap-4 text-xs text-muted-foreground ${disabled ? 'opacity-50' : ''}`}>
                  <span>• Max {MAX_FILES} files</span>
                  <span>• Up to 10MB each</span>
                  <span>• JPEG, PNG, GIF, WebP, MP4, WebM</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* File List */}
      {mediaFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Media Files ({activeFiles.length}/{MAX_FILES})</h4>
          
          {mediaFiles.map((mediaFile) => (
            <Card key={mediaFile.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* File Preview */}
                  <div className="flex-shrink-0">
                    {mediaFile.file.type.startsWith('image/') ? (
                      <img
                        src={mediaFile.preview}
                        alt={mediaFile.file.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : mediaFile.file.type.startsWith('video/') ? (
                      <video
                        src={mediaFile.preview}
                        className="w-16 h-16 object-cover rounded"
                        muted
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                        {getFileIcon(mediaFile.file)}
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{mediaFile.file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(mediaFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>

                    {/* Progress */}
                    {mediaFile.status === 'uploading' && (
                      <div className="mt-2">
                        <Progress value={mediaFile.progress} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Uploading... {mediaFile.progress}%
                        </p>
                      </div>
                    )}

                    {/* Error */}
                    {mediaFile.status === 'error' && (
                      <div className="mt-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <p className="text-sm text-destructive">
                          {mediaFile.error || 'Upload failed'}
                        </p>
                      </div>
                    )}

                    {/* Success */}
                    {mediaFile.status === 'completed' && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ Upload completed
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {mediaFile.status === 'error' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => retryUpload(mediaFile.id)}
                        disabled={disabled}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(mediaFile.id)}
                      disabled={disabled}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Tips */}
      <div className="text-sm text-muted-foreground space-y-1">
        <p>💡 <strong>Tips:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>Images and videos show instant preview while uploading</li>
          <li>Preview URLs are replaced with server URLs once uploaded</li>
          <li>Files are automatically optimized for web viewing</li>
          <li>You can remove files before or after uploading</li>
        </ul>
      </div>
    </div>
  );
};