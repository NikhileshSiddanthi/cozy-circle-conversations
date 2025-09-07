import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UploadResponse {
  uploadId: string;
  uploadUrl: string;
  expiresAt: string;
}

interface MediaFile {
  fileId: string;
  url: string;
  thumbnailUrl?: string;
  mimeType: string;
  size: number;
  orderIndex: number;
}

export const MultiImageUploadTest: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [testDraftId] = useState('05c18a93-6c14-4fc9-9c43-5842546cc55d'); // Using existing draft
  const { toast } = useToast();

  // Test function for initializing upload
  const testInitUpload = useCallback(async () => {
    try {
      setUploading(true);
      
      const { data, error } = await supabase.functions.invoke('uploads', {
        body: {
          filename: 'test-image.jpg',
          mimeType: 'image/jpeg',
          size: 1024 * 1024, // 1MB
          draftId: testDraftId,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      const uploadResponse: UploadResponse = data;
      console.log('Upload init response:', uploadResponse);
      
      toast({
        title: "Upload Initialized",
        description: `Upload ID: ${uploadResponse.uploadId}`,
      });
      
      return uploadResponse;
    } catch (error) {
      console.error('Upload init error:', error);
      toast({
        title: "Upload Init Failed", 
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setUploading(false);
    }
  }, [testDraftId]);

  // Test function for completing upload
  const testCompleteUpload = useCallback(async (uploadId: string) => {
    try {
      setUploading(true);
      
      const { data, error } = await supabase.functions.invoke('uploads', {
        body: {
          uploadId,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      const mediaFile: MediaFile = data;
      console.log('Upload complete response:', mediaFile);
      
      toast({
        title: "Upload Completed",
        description: `File ID: ${mediaFile.fileId}`,
      });
      
      return mediaFile;
    } catch (error) {
      console.error('Upload complete error:', error);
      toast({
        title: "Upload Complete Failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setUploading(false);
    }
  }, []);

  // Test function for listing draft media
  const testListMedia = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('draft-media', {
        body: {
          draftId: testDraftId,
          action: 'list',
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log('Media list response:', data);
      setMediaFiles(data || []);
      
      toast({
        title: "Media Listed",
        description: `Found ${data?.length || 0} media files`,
      });
    } catch (error) {
      console.error('List media error:', error);
      toast({
        title: "List Media Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [testDraftId]);

  // Test function for deleting media
  const testDeleteMedia = useCallback(async (fileId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('draft-media', {
        body: {
          draftId: testDraftId,
          fileId,
          action: 'delete',
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log('Delete response:', data);
      toast({
        title: "File Deleted",
        description: `File ${fileId} deleted successfully`,
      });
      
      // Refresh media list
      await testListMedia();
    } catch (error) {
      console.error('Delete media error:', error);
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [testDraftId, testListMedia]);

  // Test function for reordering media
  const testReorderMedia = useCallback(async () => {
    try {
      const currentIds = mediaFiles.map(f => f.fileId);
      const reversedOrder = [...currentIds].reverse();

      const { data, error } = await supabase.functions.invoke('draft-media', {
        body: {
          draftId: testDraftId,
          order: reversedOrder,
          action: 'reorder',
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log('Reorder response:', data);
      toast({
        title: "Media Reordered",
        description: "Media reordered successfully",
      });
      
      // Refresh media list
      await testListMedia();
    } catch (error) {
      console.error('Reorder media error:', error);
      toast({
        title: "Reorder Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [testDraftId, mediaFiles, testListMedia]);

  // Full upload test workflow
  const testFullUploadFlow = useCallback(async () => {
    try {
      // Step 1: Initialize upload
      const uploadResponse = await testInitUpload();
      
      // Step 2: Simulate file upload (in real scenario, this would be a PUT to uploadResponse.uploadUrl)
      console.log('In real scenario, PUT file to:', uploadResponse.uploadUrl);
      
      // Step 3: Complete upload
      const mediaFile = await testCompleteUpload(uploadResponse.uploadId);
      
      // Step 4: Refresh media list
      await testListMedia();
      
      toast({
        title: "Success",
        description: "Full upload flow completed successfully!",
      });
    } catch (error) {
      console.error('Full upload flow error:', error);
    }
  }, [testInitUpload, testCompleteUpload, testListMedia]);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Multi-Image Upload API Test</CardTitle>
        <p className="text-muted-foreground">
          Test draft ID: {testDraftId}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={testInitUpload} disabled={uploading}>
            Test Init Upload
          </Button>
          <Button onClick={testListMedia} disabled={uploading}>
            List Media
          </Button>
          <Button onClick={testReorderMedia} disabled={uploading || mediaFiles.length < 2}>
            Reverse Order
          </Button>
          <Button onClick={testFullUploadFlow} disabled={uploading} variant="default">
            Full Upload Test
          </Button>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Media Files ({mediaFiles.length})</h3>
          {mediaFiles.length === 0 ? (
            <p className="text-muted-foreground">No media files found. Click "List Media" to refresh.</p>
          ) : (
            <div className="grid gap-2">
              {mediaFiles.map((file) => (
                <div key={file.fileId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-mono text-sm">{file.fileId}</div>
                    <div className="text-xs text-muted-foreground">
                      {file.mimeType} • {Math.round(file.size / 1024)}KB • Order: {file.orderIndex}
                    </div>
                    {file.url && (
                      <div className="text-xs text-blue-600 truncate max-w-md">
                        {file.url}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {file.url && (
                      <img 
                        src={file.url} 
                        alt={`Media ${file.orderIndex}`}
                        className="w-12 h-12 object-cover rounded border"
                      />
                    )}
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => testDeleteMedia(file.fileId)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">API Endpoints Available:</h4>
          <div className="space-y-1 text-sm font-mono">
            <div>POST /functions/v1/uploads (init & complete)</div>
            <div>GET /functions/v1/draft-media (list)</div>
            <div>DELETE /functions/v1/draft-media (delete)</div>
            <div>PATCH /functions/v1/draft-media (reorder)</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};