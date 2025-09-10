import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Clock, 
  Trash2, 
  Edit3,
  Calendar
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Draft {
  id: string;
  title: string;
  content: string;
  groupId: string;
  savedAt: string;
  mediaFiles: string[];
  poll?: any;
  linkPreview?: any;
}

interface DraftManagerProps {
  onLoadDraft: (draft: Draft) => void;
}

export const DraftManager: React.FC<DraftManagerProps> = ({
  onLoadDraft
}) => {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<Draft[]>([]);

  useEffect(() => {
    loadDrafts();
  }, [user]);

  const loadDrafts = () => {
    if (!user) return;

    try {
      // Load from localStorage (in a real app, you'd load from backend)
      const savedDraft = localStorage.getItem(`post_draft_${user.id}`);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        setDrafts([{
          id: 'current',
          ...draft,
          savedAt: draft.savedAt || new Date().toISOString()
        }]);
      } else {
        setDrafts([]);
      }
    } catch (error) {
      console.error('Failed to load drafts:', error);
      setDrafts([]);
    }
  };

  const deleteDraft = (draftId: string) => {
    if (!user) return;

    if (window.confirm('Are you sure you want to delete this draft?')) {
      localStorage.removeItem(`post_draft_${user.id}`);
      setDrafts([]);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const getContentPreview = (content: string) => {
    if (!content) return 'No content';
    
    // Strip HTML tags for preview
    const stripped = content.replace(/<[^>]*>/g, '');
    return stripped.length > 100 ? stripped.slice(0, 100) + '...' : stripped;
  };

  const getDraftMetadata = (draft: Draft) => {
    const metadata = [];
    
    if (draft.mediaFiles && draft.mediaFiles.length > 0) {
      metadata.push(`${draft.mediaFiles.length} file${draft.mediaFiles.length !== 1 ? 's' : ''}`);
    }
    
    if (draft.poll) {
      metadata.push('Poll');
    }
    
    if (draft.linkPreview) {
      metadata.push('Link');
    }

    return metadata;
  };

  if (drafts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No Drafts</h3>
          <p className="text-sm text-muted-foreground">
            Your saved drafts will appear here. Posts are auto-saved every 10 seconds.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Saved Drafts
        </h3>
        <Badge variant="secondary">
          {drafts.length}
        </Badge>
      </div>

      <div className="space-y-3">
        {drafts.map((draft) => (
          <Card key={draft.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm mb-1 truncate">
                    {draft.title || 'Untitled Draft'}
                  </h4>
                  
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {getContentPreview(draft.content)}
                  </p>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(draft.savedAt)}
                    </div>
                    
                    {getDraftMetadata(draft).map((meta, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {meta}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => onLoadDraft(draft)}
                      className="flex items-center gap-1"
                    >
                      <Edit3 className="h-3 w-3" />
                      Edit Draft
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteDraft(draft.id)}
                      className="text-destructive hover:text-destructive flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};