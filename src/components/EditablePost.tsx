import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Edit3, X, Check, Loader2 } from 'lucide-react';
import { EnhancedMediaUpload } from './EnhancedMediaUpload';

interface EditablePostProps {
  post: {
    id: string;
    title: string;
    content: string;
    user_id: string;
    media_type?: string | null;
    media_url?: string | null;
    is_edited?: boolean;
    edited_at?: string | null;
  };
  onUpdate: () => void;
  isAuthor: boolean;
  isAdmin?: boolean;
}

export const EditablePost: React.FC<EditablePostProps> = ({
  post,
  onUpdate,
  isAuthor,
  isAdmin = false
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    title: post.title,
    content: post.content || '',
    mediaFiles: post.media_url ? 
      (post.media_type === 'multiple' ? 
        JSON.parse(post.media_url) : 
        [post.media_url]
      ) : []
  });

  const canEdit = (isAuthor || isAdmin) && user;
  
  // Debug logging
  console.log('EditablePost Debug:', {
    postId: post.id,
    userId: user?.id,
    postUserId: post.user_id,
    isAuthor,
    isAdmin,
    canEdit
  });

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      // Prepare media data
      let mediaType = null;
      let mediaUrl = null;
      
      if (editData.mediaFiles.length > 0) {
        if (editData.mediaFiles.length === 1) {
          const url = editData.mediaFiles[0];
          if (url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) {
            mediaType = 'image';
            mediaUrl = url;
          } else if (url.match(/\.(mp4|webm|mov)(\?|$)/i)) {
            mediaType = 'video';
            mediaUrl = url;
          } else {
            mediaType = 'file';
            mediaUrl = url;
          }
        } else {
          mediaType = 'multiple';
          mediaUrl = JSON.stringify(editData.mediaFiles);
        }
      }

      const { error } = await supabase
        .from('posts')
        .update({
          title: editData.title,
          content: editData.content,
          media_type: mediaType,
          media_url: mediaUrl,
          is_edited: true,
          edited_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id);

      if (error) throw error;

      toast({
        title: "Post Updated",
        description: "Your post has been successfully updated.",
      });

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating post:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update post. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      title: post.title,
      content: post.content || '',
      mediaFiles: post.media_url ? 
        (post.media_type === 'multiple' ? 
          JSON.parse(post.media_url) : 
          [post.media_url]
        ) : []
    });
    setIsEditing(false);
  };

  if (!canEdit) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-2">
          {post.title}
          {post.is_edited && (
            <span className="ml-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              Edited
            </span>
          )}
        </h3>
        {post.content && (
          <p className="text-muted-foreground whitespace-pre-wrap">{post.content}</p>
        )}
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div className="group">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">
              {post.title}
              {post.is_edited && (
                <span className="ml-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  Edited
                </span>
              )}
            </h3>
            {post.content && (
              <p className="text-muted-foreground whitespace-pre-wrap">{post.content}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
          >
            <Edit3 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Editing Post</h4>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !editData.title.trim()}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <Input
          placeholder="Post title..."
          value={editData.title}
          onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
          className="font-medium"
        />

        <Textarea
          placeholder="Post content..."
          value={editData.content}
          onChange={(e) => setEditData(prev => ({ ...prev, content: e.target.value }))}
          rows={4}
        />

        <div>
          <h5 className="text-sm font-medium mb-2">Media</h5>
          <EnhancedMediaUpload
            files={editData.mediaFiles}
            onFilesChange={(files) => setEditData(prev => ({ ...prev, mediaFiles: files }))}
            userId={user?.id}
            disabled={isSaving}
          />
        </div>
      </CardContent>
    </Card>
  );
};