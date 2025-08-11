import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, Upload, File, Image, Video, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  onFileUploaded: (url: string, type: string) => void;
  onFileRemoved: () => void;
  acceptedTypes?: string[];
  maxSize?: number; // in bytes
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return Image;
  if (type.startsWith('video/')) return Video;
  if (type === 'application/pdf') return FileText;
  return File;
};

export const FileUpload = ({ 
  onFileUploaded, 
  onFileRemoved, 
  acceptedTypes = ['image/*', 'video/*', 'application/pdf'],
  maxSize = 50 * 1024 * 1024 // 50MB
}: FileUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string; type: string } | null>(null);

  const uploadFile = async (file: File) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to upload files.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const { data, error } = await supabase.storage
        .from('post-files')
        .upload(fileName, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('post-files')
        .getPublicUrl(data.path);

      const uploadedFileData = {
        name: file.name,
        url: urlData.publicUrl,
        type: file.type
      };

      setUploadedFile(uploadedFileData);
      onFileUploaded(uploadedFileData.url, uploadedFileData.type);

      toast({
        title: "File Uploaded",
        description: "Your file has been uploaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: `File size must be less than ${maxSize / (1024 * 1024)}MB`,
        variant: "destructive",
      });
      return;
    }

    uploadFile(file);
  }, [maxSize, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'video/*': ['.mp4', '.mov', '.avi'],
      'application/pdf': ['.pdf']
    },
    multiple: false,
    disabled: uploading
  });

  const removeFile = () => {
    setUploadedFile(null);
    onFileRemoved();
  };

  if (uploadedFile) {
    const Icon = getFileIcon(uploadedFile.type);
    return (
      <div className="border rounded-lg p-4 bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium text-sm">{uploadedFile.name}</p>
              <p className="text-xs text-muted-foreground">File uploaded successfully</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={removeFile}
            className="text-destructive hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
        } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-sm">Drop the file here...</p>
        ) : (
          <div>
            <p className="text-sm font-medium mb-1">Drag & drop a file here, or click to select</p>
            <p className="text-xs text-muted-foreground">
              Supports images, videos, and PDFs up to {maxSize / (1024 * 1024)}MB
            </p>
          </div>
        )}
      </div>

      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
        </div>
      )}
    </div>
  );
};