import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useOptimisticMutation } from '@/hooks/useOptimisticMutation';
import { 
  X, 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Code, 
  Quote, 
  List, 
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Smile,
  AtSign,
  Hash,
  Image,
  Video,
  Link2,
  BarChart3,
  Save,
  Send,
  Loader2
} from 'lucide-react';
import ReactQuill from 'react-quill';
import DOMPurify from 'dompurify';
import 'react-quill/dist/quill.snow.css';
import { RichTextToolbar } from './RichTextToolbar';
import { MentionHashtagPicker } from './MentionHashtagPicker';
import { MediaUploadTab } from './MediaUploadTab';
import { LinkPreviewTab } from './LinkPreviewTab';
import { PollCreatorTab } from './PollCreatorTab';
import { DraftManager } from './DraftManager';

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
  linkPreview?: any;
  poll?: {
    question: string;
    options: string[];
    duration: number;
    multipleChoice: boolean;
  };
  mentions: string[];
  hashtags: string[];
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
  const quillRef = useRef<ReactQuill>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState('text');
  const [showMentions, setShowMentions] = useState(false);
  const [showHashtags, setShowHashtags] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [hashtagQuery, setHashtagQuery] = useState('');
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
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

  const MAX_TITLE_LENGTH = 100;
  const MAX_CONTENT_LENGTH = 5000;
  const MIN_CONTENT_LENGTH = 10;
  const AUTO_SAVE_INTERVAL = 10000; // 10 seconds

  // Initialize editing post
  useEffect(() => {
    if (editingPost) {
      setPostData({
        title: editingPost.title || '',
        content: editingPost.content || '',
        groupId: editingPost.group_id || selectedGroupId || '',
        mediaFiles: editingPost.media_url ? JSON.parse(editingPost.media_url) : [],
        mentions: [],
        hashtags: [],
        poll: editingPost.poll_question ? {
          question: editingPost.poll_question,
          options: editingPost.poll_options || [],
          duration: 7,
          multipleChoice: false
        } : undefined
      });
    }
  }, [editingPost, selectedGroupId]);

  // Auto-focus title on open
  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isOpen]);

  // Auto-save functionality
  useEffect(() => {
    if (!isOpen || !postData.title && !postData.content) return;

    const saveTimer = setTimeout(async () => {
      await autoSaveDraft();
    }, AUTO_SAVE_INTERVAL);

    return () => clearTimeout(saveTimer);
  }, [postData, isOpen]);

  // Load draft on open
  useEffect(() => {
    if (isOpen && !editingPost) {
      loadDraft();
    }
  }, [isOpen, editingPost]);

  const autoSaveDraft = useCallback(async () => {
    if (!user || (!postData.title.trim() && !postData.content.trim())) return;
    
    try {
      setIsAutoSaving(true);
      const draft = {
        ...postData,
        userId: user.id,
        savedAt: new Date().toISOString()
      };
      
      localStorage.setItem(`post_draft_${user.id}`, JSON.stringify(draft));
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [postData, user]);

  const loadDraft = useCallback(() => {
    if (!user) return;
    
    try {
      const savedDraft = localStorage.getItem(`post_draft_${user.id}`);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        setPostData(draft);
        setLastSaved(new Date(draft.savedAt));
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  }, [user]);

  const clearDraft = useCallback(() => {
    if (!user) return;
    localStorage.removeItem(`post_draft_${user.id}`);
    setLastSaved(null);
  }, [user]);

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
      if (!user) throw new Error('User not authenticated');
      if (!validateForm()) throw new Error('Validation failed');

      // Sanitize content
      const sanitizedContent = DOMPurify.sanitize(data.content);

      const postPayload = {
        title: data.title.trim(),
        content: sanitizedContent || null,
        group_id: data.groupId,
        user_id: user.id,
        media_type: data.mediaFiles.length > 0 ? 'multiple' : null,
        media_url: data.mediaFiles.length > 0 ? JSON.stringify(data.mediaFiles) : null,
        poll_question: data.poll?.question?.trim() || null,
        poll_options: data.poll?.options?.filter(opt => opt.trim()) || null,
      };

      const { data: post, error } = await supabase
        .from('posts')
        .insert(postPayload)
        .select(`
          *,
          profiles:user_id (display_name, avatar_url),
          groups (name, is_public)
        `)
        .single();

      if (error) throw error;
      return post;
    },
    queryKey: ['posts'],
    successMessage: "Post published successfully!",
    errorContext: "Failed to create post",
    onSuccess: () => {
      clearDraft();
      resetForm();
      onSuccess?.();
      onClose();
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
    clearDraft();
  };

  const handleClose = () => {
    if (postData.title.trim() || postData.content.trim()) {
      if (window.confirm('You have unsaved changes. Save as draft before closing?')) {
        autoSaveDraft();
      }
    }
    onClose();
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
                ref={titleInputRef}
                id="title"
                value={postData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Give your post a title..."
                className={`text-lg font-medium ${validation.titleError ? 'border-destructive' : ''}`}
                maxLength={MAX_TITLE_LENGTH}
                required
                aria-describedby={validation.titleError ? 'title-error' : 'title-counter'}
              />
              <div className="flex justify-between items-center">
                {validation.titleError && (
                  <p id="title-error" className="text-sm text-destructive">
                    {validation.titleError}
                  </p>
                )}
                <p id="title-counter" className="text-sm text-muted-foreground ml-auto">
                  {postData.title.length}/{MAX_TITLE_LENGTH}
                </p>
              </div>
            </div>

            {/* Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="text" className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Text
                </TabsTrigger>
                <TabsTrigger value="media" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Media
                </TabsTrigger>
                <TabsTrigger value="link" className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Link
                </TabsTrigger>
                <TabsTrigger value="poll" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Poll
                </TabsTrigger>
              </TabsList>

              {/* Text Content Tab */}
              <TabsContent value="text" className="space-y-4">
                <RichTextToolbar quillRef={quillRef} />
                
                <div className="relative">
                  <ReactQuill
                    ref={quillRef}
                    value={postData.content}
                    onChange={handleContentChange}
                    placeholder="Share your thoughts, ideas, or start a discussion..."
                    className={`${validation.contentError ? 'border-destructive' : ''}`}
                    modules={{
                      toolbar: false, // Using custom toolbar
                      keyboard: {
                        bindings: {
                          tab: {
                            key: 9,
                            handler: () => {
                              // Show formatting help
                              return true;
                            }
                          }
                        }
                      }
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
                        const quill = quillRef.current?.getEditor();
                        if (quill) {
                          const range = quill.getSelection();
                          if (range) {
                            const prefix = showMentions ? '@' : '#';
                            quill.insertText(range.index - (showMentions ? mentionQuery.length + 1 : hashtagQuery.length + 1), `${prefix}${item.name} `);
                          }
                        }
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
                <MediaUploadTab
                  files={postData.mediaFiles}
                  onFilesChange={(files) => setPostData(prev => ({ ...prev, mediaFiles: files }))}
                />
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
              </div>

              <Button
                type="submit"
                disabled={isPublishing || isSaving}
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
};