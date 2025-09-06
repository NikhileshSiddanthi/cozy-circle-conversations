import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useOptimisticMutation } from '@/hooks/useOptimisticMutation';
import { RichTextToolbar } from './RichTextToolbar';
import { MentionHashtagPicker } from './MentionHashtagPicker';
import { MediaUploadTab } from './MediaUploadTab';
import { LinkPreviewTab } from './LinkPreviewTab';
import { PollCreatorTab } from './PollCreatorTab';
import { 
  X, 
  Loader2, 
  Save, 
  Send,
  Type,
  Image,
  Link,
  BarChart3
} from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import DOMPurify from 'dompurify';

const MAX_TITLE_LENGTH = 100;
const MAX_CONTENT_LENGTH = 5000;
const MIN_CONTENT_LENGTH = 10;

interface Group {
  id: string;
  name: string;
  is_public: boolean;
}

interface PostEditorProps {
  groups: Group[];
  selectedGroupId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editingPost?: any;
}

interface PostData {
  title: string;
  content: string;
  groupId: string;
  mediaFiles: string[];
  mentions: string[];
  hashtags: string[];
  poll?: {
    question: string;
    options: string[];
    duration: number;
    multipleChoice: boolean;
  };
  linkPreview?: {
    url: string;
    title?: string;
    description?: string;
    image?: string;
  };
}

interface ServerDraft {
  id: string;
  user_id: string;
  group_id: string;
  title: string;
  content: string;
  status: string;
  metadata: any;
  draft_media?: Array<{
    id: string;
    file_id: string;
    url: string;
    mime_type: string;
    file_size: number;
    status: string;
  }>;
  created_at: string;
  updated_at: string;
}

export const ComprehensivePostEditor: React.FC<PostEditorProps> = ({
  groups,
  selectedGroupId,
  isOpen,
  onClose,
  onSuccess,
  editingPost
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'text' | 'media' | 'link' | 'poll'>('text');
  const [showMentions, setShowMentions] = useState(false);
  const [showHashtags, setShowHashtags] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [hashtagQuery, setHashtagQuery] = useState('');
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentDraft, setCurrentDraft] = useState<ServerDraft | null>(null);
  const [isDraftLoading, setIsDraftLoading] = useState(false);
  
  const [postData, setPostData] = useState<PostData>({
    title: '',
    content: '',
    groupId: selectedGroupId || '',
    mediaFiles: [],
    mentions: [],
    hashtags: []
  });

  const [validation, setValidation] = useState({
    titleError: '',
    contentError: '',
    generalError: ''
  });

  // Auto-save effect
  useEffect(() => {
    if (currentDraft && (postData.title.trim() || postData.content.trim())) {
      const timeoutId = setTimeout(autoSaveDraft, 10000); // Auto-save every 10 seconds
      return () => clearTimeout(timeoutId);
    }
  }, [postData.title, postData.content, currentDraft]);

  // Create or load draft when component opens
  useEffect(() => {
    if (isOpen && user && !editingPost && postData.groupId) {
      createOrLoadDraft();
    }
  }, [isOpen, editingPost, postData.groupId]);

  // Auto-focus title when editor opens
  useEffect(() => {
    if (isOpen && !editingPost) {
      const titleInput = document.getElementById('title');
      if (titleInput) {
        titleInput.focus();
      }
    }
  }, [isOpen, editingPost]);

  const createOrLoadDraft = useCallback(async () => {
    if (!user || !postData.groupId) return;
    
    setIsDraftLoading(true);
    try {
      // First try to load existing draft for this group
      const { data, error } = await supabase.functions.invoke('draft-manager', {
        body: { groupId: postData.groupId }
      });

      if (error) {
        console.error('Error loading drafts:', error);
        // Create new draft if loading fails
        await createNewDraft();
        return;
      }

      const draftsResponse = data as { drafts: ServerDraft[] };
      const existingDraft = draftsResponse.drafts.find(d => d.group_id === postData.groupId);

      if (existingDraft) {
        // Load existing draft
        setCurrentDraft(existingDraft);
        setPostData({
          title: existingDraft.title || '',
          content: existingDraft.content || '',
          groupId: existingDraft.group_id,
          mediaFiles: existingDraft.draft_media?.map(m => m.url) || [],
          mentions: existingDraft.metadata?.mentions || [],
          hashtags: existingDraft.metadata?.hashtags || [],
          poll: existingDraft.metadata?.poll,
          linkPreview: existingDraft.metadata?.linkPreview
        });
        setLastSaved(new Date(existingDraft.updated_at));
      } else {
        // Create new draft
        await createNewDraft();
      }
    } catch (error) {
      console.error('Failed to create or load draft:', error);
      toast({
        title: "Error",
        description: "Failed to load draft. Starting with empty composer.",
        variant: "destructive"
      });
    } finally {
      setIsDraftLoading(false);
    }
  }, [user, postData.groupId]);

  const createNewDraft = useCallback(async () => {
    if (!user || !postData.groupId) return;

    try {
      const { data, error } = await supabase.functions.invoke('draft-manager', {
        body: {
          groupId: postData.groupId,
          title: '',
          content: '',
          metadata: {}
        }
      });

      if (error) {
        throw error;
      }

      const draftResponse = data as { draft: ServerDraft };
      setCurrentDraft(draftResponse.draft);
      console.log('New draft created:', draftResponse.draft.id);
    } catch (error) {
      console.error('Failed to create new draft:', error);
      throw error;
    }
  }, [user, postData.groupId]);

  const autoSaveDraft = useCallback(async () => {
    if (!currentDraft || !user || (!postData.title.trim() && !postData.content.trim())) return;
    
    try {
      setIsAutoSaving(true);
      
      const { data, error } = await supabase.functions.invoke('draft-manager', {
        body: {
          title: postData.title,
          content: postData.content,
          metadata: {
            mentions: postData.mentions,
            hashtags: postData.hashtags,
            poll: postData.poll,
            linkPreview: postData.linkPreview
          }
        }
      });

      if (error) {
        throw error;
      }

      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [postData, user, currentDraft]);

  const clearDraft = useCallback(async () => {
    if (!currentDraft || !user) return;
    
    try {
      const { error } = await supabase.functions.invoke('draft-manager', {
        body: null
      });

      if (error) {
        throw error;
      }

      setCurrentDraft(null);
      setLastSaved(null);
      console.log('Draft deleted successfully');
    } catch (error) {
      console.error('Failed to delete draft:', error);
    }
  }, [user, currentDraft]);

  const validateForm = useCallback(() => {
    const errors = {
      titleError: '',
      contentError: '',
      generalError: ''
    };

    // Title validation
    if (!postData.title.trim()) {
      errors.titleError = 'Title is required';
    } else if (postData.title.length > MAX_TITLE_LENGTH) {
      errors.titleError = `Title must be ${MAX_TITLE_LENGTH} characters or less`;
    }

    // Content validation
    const hasMinContent = postData.content.trim().length >= MIN_CONTENT_LENGTH;
    const hasMedia = postData.mediaFiles.length > 0;
    const hasPoll = postData.poll && postData.poll.question.trim();
    const hasLink = postData.linkPreview;

    if (!hasMinContent && !hasMedia && !hasPoll && !hasLink) {
      errors.contentError = `Post must have at least ${MIN_CONTENT_LENGTH} characters or include media/poll/link`;
    }

    if (postData.content.length > MAX_CONTENT_LENGTH) {
      errors.contentError = `Content must be ${MAX_CONTENT_LENGTH} characters or less`;
    }

    // Group validation
    if (!postData.groupId) {
      errors.generalError = 'Please select a group';
    }

    setValidation(errors);
    return !errors.titleError && !errors.contentError && !errors.generalError;
  }, [postData]);

  const createPostMutation = useOptimisticMutation({
    mutationFn: async (data: PostData) => {
      if (!user || !currentDraft) throw new Error('User not authenticated or no draft');
      if (!validateForm()) throw new Error('Validation failed');

      const { data: result, error } = await supabase.functions.invoke('publish-post', {
        body: {
          draftId: currentDraft.id,
          groupId: data.groupId
        }
      });

      if (error) {
        throw new Error(`Failed to publish post: ${error.message}`);
      }

      return result.post;
    },
    queryKey: ['posts'],
    successMessage: "Post published successfully!",
    errorContext: "Failed to publish post",
    onSuccess: () => {
      setCurrentDraft(null);
      resetForm();
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      // On error, draft remains intact on server
      toast({
        title: "Failed to publish",
        description: "Your draft is saved. You can retry, edit, or discard it.",
        variant: "destructive",
        duration: 10000,
      });
    }
  });

  const saveDraftMutation = useOptimisticMutation({
    mutationFn: async () => {
      await autoSaveDraft();
      return { success: true };
    },
    queryKey: ['drafts'],
    successMessage: "Draft saved successfully!",
    errorContext: "Failed to save draft"
  });

  const resetForm = () => {
    setPostData({
      title: '',
      content: '',
      groupId: selectedGroupId || '',
      mediaFiles: [],
      mentions: [],
      hashtags: []
    });
    setValidation({
      titleError: '',
      contentError: '',
      generalError: ''
    });
    setActiveTab('text');
  };

  const handleClose = () => {
    if (postData.title.trim() || postData.content.trim() || postData.mediaFiles.length > 0) {
      if (window.confirm('You have unsaved changes. Save as draft before closing?')) {
        autoSaveDraft();
      } else if (window.confirm('Discard draft and all uploaded media?')) {
        clearDraft();
      }
    }
    onClose();
  };

  const handleDiscardDraft = async () => {
    if (window.confirm('This will permanently delete your draft and all uploaded media. Are you sure?')) {
      await clearDraft();
      resetForm();
      onClose();
      toast({
        title: "Draft discarded",
        description: "Your draft and uploaded media have been removed.",
      });
    }
  };

  const handleRetryPublish = () => {
    if (validateForm()) {
      createPostMutation.mutate(postData);
    }
  };

  const handleTitleChange = (value: string) => {
    if (value.length <= MAX_TITLE_LENGTH) {
      setPostData(prev => ({ ...prev, title: value }));
      setValidation(prev => ({ ...prev, titleError: '' }));
    }
  };

  const handleContentChange = (value: string) => {
    if (value.length <= MAX_CONTENT_LENGTH) {
      setPostData(prev => ({ ...prev, content: value }));
      setValidation(prev => ({ ...prev, contentError: '' }));
      
      // Check for mentions and hashtags
      const mentionMatch = value.match(/@(\w*)$/);
      const hashtagMatch = value.match(/#(\w*)$/);
      
      if (mentionMatch) {
        setMentionQuery(mentionMatch[1]);
        setShowMentions(true);
        setShowHashtags(false);
      } else if (hashtagMatch) {
        setHashtagQuery(hashtagMatch[1]);
        setShowHashtags(true);
        setShowMentions(false);
      } else {
        setShowMentions(false);
        setShowHashtags(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before publishing.",
        variant: "destructive"
      });
      return;
    }

    createPostMutation.mutate(postData);
  };

  const selectedGroup = groups.find(g => g.id === postData.groupId);
  const isPublishing = createPostMutation.isPending;
  const isSaving = saveDraftMutation.isPending;

  if (!isOpen || !user) return null;

  // Show loading while creating/loading draft
  if (isDraftLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <Card className="p-8">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading draft...</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback>
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {user.user_metadata?.display_name || user.email?.split('@')[0] || 'You'}
                </p>
                {selectedGroup && (
                  <p className="text-sm text-muted-foreground">
                    to {selectedGroup.name}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isAutoSaving && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </div>
              )}
              {lastSaved && !isAutoSaving && (
                <Badge variant="outline" className="text-xs">
                  Saved {lastSaved.toLocaleTimeString()}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                aria-label="Close editor"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Group Selection */}
            {!selectedGroupId && groups.length > 1 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Post to:</label>
                <select
                  value={postData.groupId}
                  onChange={(e) => setPostData(prev => ({ ...prev, groupId: e.target.value }))}
                  className="w-full p-2 border border-border rounded-md"
                  required
                >
                  <option value="">Select a group</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name} {group.is_public ? '(Public)' : '(Private)'}
                    </option>
                  ))}
                </select>
                {validation.generalError && (
                  <p className="text-sm text-destructive">{validation.generalError}</p>
                )}
              </div>
            )}

            {/* Title Field */}
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title *
              </label>
              <Input
                id="title"
                type="text"
                value={postData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="What's this post about?"
                className="text-lg font-medium"
                autoFocus
              />
              <div className="flex justify-between items-center">
                {validation.titleError && (
                  <p className="text-sm text-destructive">{validation.titleError}</p>
                )}
                <p className={`text-sm ml-auto ${
                  postData.title.length > MAX_TITLE_LENGTH * 0.8 
                    ? postData.title.length > MAX_TITLE_LENGTH 
                      ? 'text-destructive' 
                      : 'text-orange-500'
                    : 'text-muted-foreground'
                }`}>
                  {postData.title.length}/{MAX_TITLE_LENGTH}
                </p>
              </div>
            </div>

            {/* Tabbed Content */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="text" className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Text
                </TabsTrigger>
                <TabsTrigger value="media" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Media
                </TabsTrigger>
                <TabsTrigger value="link" className="flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  Link
                </TabsTrigger>
                <TabsTrigger value="poll" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Poll
                </TabsTrigger>
              </TabsList>

              {/* Text Tab */}
              <TabsContent value="text" className="space-y-4">
                {/* Content Editor */}
                <div className="relative">
                  <ReactQuill
                    value={postData.content}
                    onChange={handleContentChange}
                    placeholder="Share your thoughts..."
                    className="min-h-[200px]"
                    modules={{
                      toolbar: [
                        ['bold', 'italic', 'underline', 'strike'],
                        ['blockquote', 'code-block'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        [{ 'header': [1, 2, 3, false] }],
                        ['clean']
                      ],
                      clipboard: {
                        matchVisual: false,
                      },
                    }}
                    formats={[
                      'bold', 'italic', 'underline', 'strike',
                      'blockquote', 'code-block',
                      'list', 'bullet', 'indent',
                      'header'
                    ]}
                  />
                  
                  {/* Mention/Hashtag Picker */}
                  {(showMentions || showHashtags) && (
                    <MentionHashtagPicker
                      type={showMentions ? 'mention' : 'hashtag'}
                      query={showMentions ? mentionQuery : hashtagQuery}
                      groupId={postData.groupId}
                      onSelect={(item) => {
                        const newContent = showMentions
                          ? postData.content.replace(/@\w*$/, `@${item} `)
                          : postData.content.replace(/#\w*$/, `#${item} `);
                        handleContentChange(newContent);
                        setShowMentions(false);
                        setShowHashtags(false);
                      }}
                    />
                  )}
                </div>

                {/* Formatting Tip */}
                <p className="text-sm text-muted-foreground">
                  Tip: Use **bold**, *italic*, @mention, #hashtag for formatting. Press Tab for formatting options.
                </p>

                {/* Character Counter */}
                <div className="flex justify-between items-center">
                  {validation.contentError && (
                    <p className="text-sm text-destructive">{validation.contentError}</p>
                  )}
                  <p className={`text-sm ml-auto ${
                    postData.content.length > MAX_CONTENT_LENGTH * 0.8 
                      ? postData.content.length > MAX_CONTENT_LENGTH 
                        ? 'text-destructive' 
                        : 'text-orange-500'
                      : 'text-muted-foreground'
                  }`}>
                    {postData.content.length}/{MAX_CONTENT_LENGTH}
                  </p>
                </div>
              </TabsContent>

              {/* Media Tab */}
              <TabsContent value="media">
                {currentDraft && (
                  <MediaUploadTab
                    files={postData.mediaFiles}
                    onFilesChange={(files) => setPostData(prev => ({ ...prev, mediaFiles: files }))}
                    groupId={postData.groupId}
                    userId={user?.id}
                    draftId={currentDraft.id}
                  />
                )}
              </TabsContent>

              {/* Link Tab */}
              <TabsContent value="link">
                <LinkPreviewTab
                  preview={postData.linkPreview}
                  onPreviewChange={(preview) => setPostData(prev => ({ ...prev, linkPreview: preview }))}
                />
              </TabsContent>

              {/* Poll Tab */}
              <TabsContent value="poll">
                <PollCreatorTab
                  poll={postData.poll}
                  onPollChange={(poll) => setPostData(prev => ({ ...prev, poll }))}
                />
              </TabsContent>
            </Tabs>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  disabled={isPublishing || isSaving}
                >
                  Cancel
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => saveDraftMutation.mutate({})}
                  disabled={isPublishing || isSaving || (!postData.title.trim() && !postData.content.trim())}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Draft'}
                </Button>

                {/* Show discard option if there's content */}
                {(postData.title.trim() || postData.content.trim() || postData.mediaFiles.length > 0) && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDiscardDraft}
                    disabled={isPublishing || isSaving}
                    size="sm"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Discard
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Show retry button if there was a previous error */}
                {createPostMutation.isError && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRetryPublish}
                    disabled={isPublishing || !postData.title.trim() || !postData.groupId}
                    className="flex items-center gap-2"
                  >
                    <Loader2 className="h-4 w-4" />
                    Retry
                  </Button>
                )}

                <Button
                  type="submit"
                  disabled={isPublishing || isSaving || !postData.title.trim() || !postData.groupId}
                  className="flex items-center gap-2"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Publish
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};