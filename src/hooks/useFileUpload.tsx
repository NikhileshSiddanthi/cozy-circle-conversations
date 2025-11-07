import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UploadResult {
  url: string;
  name: string;
  size: number;
  type: string;
}

const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024, // 10MB
  video: 50 * 1024 * 1024, // 50MB
  file: 20 * 1024 * 1024,  // 20MB
};

export const useFileUpload = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (file: File): Promise<UploadResult | null> => {
    if (!user) {
      toast.error('You must be logged in to upload files');
      return null;
    }

    // Validate file type and size
    const fileType = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
      ? 'video'
      : 'file';

    const maxSize = MAX_FILE_SIZES[fileType];
    if (file.size > maxSize) {
      toast.error(`File too large. Max size: ${maxSize / (1024 * 1024)}MB`);
      return null;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `messenger-attachments/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('post-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('post-files')
        .getPublicUrl(data.path);

      setProgress(100);

      return {
        url: publicUrl,
        name: file.name,
        size: file.size,
        type: fileType,
      };
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
      return null;
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return {
    uploadFile,
    uploading,
    progress,
  };
};
