import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Edit3, X, Check, Loader2 } from 'lucide-react';

interface EditableCommentProps {
  comment: {
    id: string;
    content: string;
    user_id: string;
    is_edited?: boolean;
    edited_at?: string | null;
  };
  onUpdate: () => void;
  isAuthor: boolean;
  isAdmin?: boolean;
}

export const EditableComment: React.FC<EditableCommentProps> = ({
  comment,
  onUpdate,
  isAuthor,
  isAdmin = false
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const canEdit = (isAuthor || isAdmin) && user;

  const handleSave = async () => {
    if (!user || !editContent.trim()) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('comments')
        .update({
          content: editContent.trim(),
          is_edited: true,
          edited_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', comment.id);

      if (error) throw error;

      toast({
        title: "Comment Updated",
        description: "Your comment has been successfully updated.",
      });

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating comment:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update comment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  if (!canEdit) {
    return (
      <div>
        <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
        {comment.is_edited && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded mt-1 inline-block">
            Edited
          </span>
        )}
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div className="group">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
            {comment.is_edited && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded mt-1 inline-block">
                Edited
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 h-6 w-6 p-0"
          >
            <Edit3 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2 border border-primary/20 rounded">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Editing comment</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isSaving}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !editContent.trim()}
            className="h-6 w-6 p-0"
          >
            {isSaving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      <Textarea
        value={editContent}
        onChange={(e) => setEditContent(e.target.value)}
        rows={3}
        className="text-sm"
        placeholder="Edit your comment..."
      />
    </div>
  );
};