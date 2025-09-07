import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useOptimisticMutation } from "@/hooks/useOptimisticMutation";
import { 
  Image, 
  Video, 
  Link2, 
  BarChart3, 
  Globe, 
  Lock, 
  Calendar,
  Bold,
  Italic,
  List,
  Hash,
  AtSign,
  Loader2
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnhancedMediaUpload } from "./EnhancedMediaUpload";
import { RichTextEditor } from "./RichTextEditor";
import { MentionsInput } from "./MentionsInput";
import { LinkPreview } from "./LinkPreview";
import { PollCreator } from "./PollCreator";

interface Group {
  id: string;
  name: string;
  is_public: boolean;
}

interface PostComposerProps {
  groups: Group[];
  selectedGroupId?: string;
  onSuccess?: () => void;
  onOptimisticPost?: (post: any) => void;
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
    allowMultiple: boolean;
    duration: number;
  };
  visibility: 'public' | 'private';
  scheduledAt?: string;
  mentions: string[];
  hashtags: string[];
}

export const EnhancedPostComposer = ({ groups, selectedGroupId, onSuccess, onOptimisticPost }: PostComposerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTab, setCurrentTab] = useState("text");
  const [characterCount, setCharacterCount] = useState(0);
  const [isDraft, setIsDraft] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<any>(null);
  const [isDraftLoading, setIsDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [titleSaveTimer, setTitleSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [postData, setPostData] = useState<PostData>({
    title: "",
    content: "",
    groupId: selectedGroupId || "",
    mediaFiles: [],
    visibility: 'public',
    mentions: [],
    hashtags: []
  });

  const MAX_CHARACTERS = 5000;
  const DRAFT_SAVE_INTERVAL = 10000; // 10 seconds
  const TITLE_SAVE_DELAY = 1000; // 1 second debounce for title

  // Create or load draft when group changes
  useEffect(() => {
    if (user && postData.groupId && isExpanded) {
      createOrLoadDraft();
    }
  }, [user, postData.groupId, isExpanded]);

  // Auto-save draft
  useEffect(() => {
    if (currentDraft && (postData.content.trim() || postData.title.trim())) {
      const timer = setTimeout(() => {
        saveDraft();
      }, DRAFT_SAVE_INTERVAL);

      return () => clearTimeout(timer);
    }
  }, [postData, currentDraft]);

  // Cleanup title save timer on unmount
  useEffect(() => {
    return () => {
      if (titleSaveTimer) {
        clearTimeout(titleSaveTimer);
      }
    };
  }, [titleSaveTimer]);

  const createOrLoadDraft = useCallback(async () => {
    if (!user || !postData.groupId) return;
    
    setIsDraftLoading(true);
    setDraftError(null);
    
    try {
      // Get user session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session - please refresh the page');
      }

      console.log('Loading drafts for group:', postData.groupId);

      // Load existing draft for this group using supabase client
      const response = await supabase.functions.invoke('draft-manager', {
        body: {
          method: 'GET',
          path: `/drafts?groupId=${postData.groupId}`
        }
      });

      if (response.error) {
        console.error('Error loading drafts:', response.error);
        // Try to create new draft if loading fails
        await createNewDraft();
        return;
      }

      const existingDraft = response.data?.drafts?.find((d: any) => d.group_id === postData.groupId);

      if (existingDraft) {
        // Load existing draft
        console.log('Loading existing draft:', existingDraft.id, 'Title:', existingDraft.title);
        setCurrentDraft(existingDraft);
        setPostData(prev => ({
          ...prev,
          title: existingDraft.title || '',
          content: existingDraft.content || '',
          mediaFiles: existingDraft.draft_media?.map((m: any) => m.url) || []
        }));
        setCharacterCount(existingDraft.content?.length || 0);
      } else {
        // Create new draft
        await createNewDraft();
      }
    } catch (error) {
      console.error('Failed to create or load draft:', error);
      setDraftError(error instanceof Error ? error.message : 'Failed to load draft');
      
      // Create a fallback local draft to allow posting
      const fallbackDraft = {
        id: `local_${Date.now()}`,
        user_id: user.id,
        group_id: postData.groupId,
        title: '',
        content: '',
        status: 'editing',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isLocalFallback: true
      };
      setCurrentDraft(fallbackDraft);
      
      toast({
        title: "Draft Creation Failed",
        description: "Using offline mode. Your post will be created directly.",
        variant: "destructive",
      });
    } finally {
      setIsDraftLoading(false);
    }
  }, [user, postData.groupId, toast]);

  const createNewDraft = useCallback(async () => {
    if (!user || !postData.groupId) return;

    try {
      console.log('Creating new draft for group:', postData.groupId);
      
      const response = await supabase.functions.invoke('draft-manager', {
        body: {
          method: 'POST',
          path: '/drafts',
          data: {
            groupId: postData.groupId,
            title: '',
            content: '',
            metadata: {}
          }
        }
      });

      if (response.error) {
        throw new Error(`Failed to create draft: ${response.error.message || 'Unknown error'}`);
      }

      if (!response.data?.draft) {
        throw new Error('No draft returned from server');
      }

      console.log('New draft created:', response.data.draft.id);
      setCurrentDraft(response.data.draft);
      setDraftError(null);
      
    } catch (error) {
      console.error('Failed to create new draft:', error);
      
      // Create fallback local draft
      const fallbackDraft = {
        id: `local_${Date.now()}`,
        user_id: user.id,
        group_id: postData.groupId,
        title: '',
        content: '',
        status: 'editing',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isLocalFallback: true
      };
      
      setCurrentDraft(fallbackDraft);
      setDraftError('Draft creation failed - using offline mode');
      
      toast({
        title: "Draft Creation Failed",
        description: "Using offline mode. You can still create posts.",
        variant: "destructive",
      });
    }
  }, [user, postData.groupId, toast]);

  const saveDraft = useCallback(async (specificData?: { title?: string; content?: string }) => {
    if (!currentDraft || !user) return;
    
    const dataToSave = specificData || postData;
    
    // Only save if there's actually content
    if (!dataToSave.content?.trim() && !dataToSave.title?.trim()) return;
    
    try {
      console.log('Saving draft:', currentDraft.id, 'Title:', dataToSave.title);
      
      const response = await supabase.functions.invoke('draft-manager', {
        body: {
          method: 'PUT',
          path: `/drafts/${currentDraft.id}`,
          data: {
            title: dataToSave.title,
            content: dataToSave.content,
            metadata: {
              mentions: postData.mentions,
              hashtags: postData.hashtags
            }
          }
        }
      });

      if (response.error) {
        throw new Error(`Failed to save draft: ${response.error.message}`);
      }
      
      console.log('Draft saved successfully');
      setIsDraft(true);
      setTimeout(() => setIsDraft(false), 2000);
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }, [postData, user, currentDraft]);

  const clearDraft = useCallback(async () => {
    if (!currentDraft || !user) return;
    
    try {
      const response = await supabase.functions.invoke('draft-manager', {
        body: {
          method: 'DELETE',
          path: `/drafts/${currentDraft.id}`
        }
      });

      if (response.error) {
        throw new Error(`Failed to delete draft: ${response.error.message}`);
      }

      setCurrentDraft(null);
    } catch (error) {
      console.error('Failed to delete draft:', error);
    }
  }, [user, currentDraft]);

  // Debounced title save function
  const saveTitle = useCallback(async (title: string) => {
    if (!currentDraft || !title.trim()) return;
    
    console.log('Debounced title save:', title);
    await saveDraft({ title, content: postData.content });
  }, [currentDraft, postData.content, saveDraft]);

  // Handle title change with debouncing
  const handleTitleChange = useCallback((newTitle: string) => {
    console.log('Title changing to:', newTitle);
    setPostData(prev => ({ ...prev, title: newTitle }));
    
    // Clear existing timer
    if (titleSaveTimer) {
      clearTimeout(titleSaveTimer);
    }
    
    // Set new timer for debounced save
    const timer = setTimeout(() => {
      saveTitle(newTitle);
    }, TITLE_SAVE_DELAY);
    
    setTitleSaveTimer(timer);
  }, [titleSaveTimer, saveTitle, TITLE_SAVE_DELAY]);

  const createPostMutation = useOptimisticMutation({
    mutationFn: async (postData: PostData) => {
      if (!currentDraft) {
        throw new Error('No draft available - please refresh the page');
      }

      // Handle local fallback drafts by creating post directly
      if (currentDraft.isLocalFallback) {
        console.log('Publishing with local fallback draft');
        
        // Create post directly without publish-post function
        const { data: postResult, error: postError } = await supabase
          .from('posts')
          .insert({
            user_id: user!.id,
            group_id: postData.groupId,
            title: postData.title || 'Untitled Post',
            content: postData.content || '',
            media_type: postData.mediaFiles.length > 0 ? (postData.mediaFiles.length > 1 ? 'multiple' : 'image') : null,
            media_url: postData.mediaFiles.length > 0 ? postData.mediaFiles[0] : null,
            metadata: {
              fallback_mode: true,
              visibility: postData.visibility || 'public'
            }
          })
          .select()
          .single();

        if (postError) {
          throw new Error(postError.message);
        }

        return {
          postId: postResult.id,
          attachedMediaCount: postData.mediaFiles.length,
          postUrl: `/posts/${postResult.id}`
        };
      }

      // Normal draft publishing
      const response = await supabase.functions.invoke('publish-post', {
        body: {
          draftId: currentDraft.id,
          visibility: postData.visibility || 'public',
          publishOptions: {
            notifyMembers: true
          }
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    queryKey: ['posts'],
    optimisticUpdate: (oldData: any, variables: PostData) => {
      const optimisticPost = {
        id: `temp_${Date.now()}`,
        title: variables.title,
        content: variables.content,
        user_id: user!.id,
        group_id: variables.groupId,
        like_count: 0,
        comment_count: 0,
        created_at: new Date().toISOString(),
        profiles: {
          display_name: user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'You',
          avatar_url: user?.user_metadata?.avatar_url
        },
        media_type: variables.mediaFiles.length > 0 ? 'multiple' : null,
        media_url: variables.mediaFiles.length > 0 ? JSON.stringify(variables.mediaFiles) : null,
        poll_question: variables.poll?.question || null,
        poll_options: variables.poll?.options || null,
        is_pinned: false,
        media_thumbnail: null,
        dislike_count: 0,
        _isOptimistic: true
      };

      onOptimisticPost?.(optimisticPost);
      return oldData;
    },
    successMessage: "Post published successfully!",
    errorContext: "Failed to create post",
    onSuccess: () => {
      resetForm();
      clearDraft();
      onSuccess?.();
    }
  });

  const resetForm = () => {
    setPostData({
      title: "",
      content: "",
      groupId: selectedGroupId || "",
      mediaFiles: [],
      visibility: 'public',
      mentions: [],
      hashtags: []
    });
    setCharacterCount(0);
    setIsExpanded(false);
    setCurrentTab("text");
    console.log('Form reset, postData cleared');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate content - must have title OR content OR media
    const hasTitle = postData.title.trim().length > 0;
    const hasContent = postData.content.trim().length > 0;
    const hasMedia = postData.mediaFiles.length > 0;
    
    if (!hasTitle && !hasContent && !hasMedia) {
      toast({
        title: "Content Required",
        description: "Please add a title, content, or media to your post.",
        variant: "destructive",
      });
      return;
    }

    if (!postData.groupId) {
      toast({
        title: "Group Required",
        description: "Please select a group for your post.",
        variant: "destructive",
      });
      return;
    }

    createPostMutation.mutate(postData);
  };

  const updateContent = (content: string) => {
    setPostData(prev => ({ ...prev, content }));
    setCharacterCount(content.length);
  };

  const selectedGroup = groups.find(g => g.id === postData.groupId);
  const warningThreshold = MAX_CHARACTERS * 0.8;
  const isOverLimit = characterCount > MAX_CHARACTERS;

  if (!user) return null;

  const userInitials = user.email?.charAt(0).toUpperCase() || "U";

  return (
    <Card className="border-border/50 bg-card hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        {!isExpanded ? (
          // Inline composer
           <div className="flex items-center gap-4">
             <Avatar className="h-10 w-10">
               <AvatarImage src={user.user_metadata?.avatar_url} />
               <AvatarFallback className="bg-primary/10 text-primary font-medium">
                 {userInitials}
               </AvatarFallback>
             </Avatar>

             <div 
               className="flex-1 bg-muted/30 border border-border/50 rounded-xl px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors duration-200"
               onClick={() => setIsExpanded(true)}
               data-testid="create-post-button"
             >
               <p className="text-muted-foreground text-sm">
                 Share something with the group...
               </p>
             </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="h-9 w-9 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={() => {
                  setIsExpanded(true);
                  setCurrentTab("media");
                }}
              >
                <Image className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-9 w-9 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={() => {
                  setIsExpanded(true);
                  setCurrentTab("poll");
                }}
              >
                <BarChart3 className="h-5 w-5" />
              </Button>
            </div>
          </div>
         ) : (
           // Expanded composer
           <form onSubmit={handleSubmit} className="space-y-4" data-testid="post-composer-expanded">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">
                    {user.user_metadata?.display_name || user.email?.split('@')[0] || 'You'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {selectedGroup ? (
                      <>
                        <span>to {selectedGroup.name}</span>
                        {selectedGroup.is_public ? (
                          <Globe className="h-3 w-3" />
                        ) : (
                          <Lock className="h-3 w-3" />
                        )}
                      </>
                    ) : (
                      <span>Select a group</span>
                    )}
                  </div>
                </div>
              </div>
              
              {isDraft && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <div className="w-2 h-2 bg-green-600 rounded-full" />
                  Draft saved
                </div>
              )}
            </div>

            {!selectedGroupId && (
              <Select
                value={postData.groupId}
                onValueChange={(value) => setPostData(prev => ({ ...prev, groupId: value }))}
                required
              >
                <SelectTrigger className="border-border/50 focus:border-primary">
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex items-center gap-2">
                        {group.is_public ? (
                          <Globe className="h-3 w-3" />
                        ) : (
                          <Lock className="h-3 w-3" />
                        )}
                        {group.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

              <Input
                placeholder="Give your post a title..."
                value={postData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="border-border/50 focus:border-primary text-base py-3 font-medium"
                data-testid="title-input"
                required={false}
              />

            <div className="space-y-3">
              <RichTextEditor
                value={postData.content}
                onChange={updateContent}
                placeholder="Share your thoughts, ideas, or start a discussion..."
                maxLength={MAX_CHARACTERS}
                showToolbar
                data-testid="content-textarea"
              />
              
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">
                    Press Tab for formatting options
                  </span>
                </div>
                <div className={`font-medium ${
                  isOverLimit 
                    ? 'text-destructive' 
                    : characterCount > warningThreshold 
                      ? 'text-orange-500' 
                      : 'text-muted-foreground'
                }`}>
                  {characterCount}/{MAX_CHARACTERS}
                </div>
              </div>
            </div>

            <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-muted/50">
                <TabsTrigger value="text" className="text-xs">
                  <Hash className="h-3 w-3 mr-1" />
                  Text
                </TabsTrigger>
                 <TabsTrigger value="media" className="text-xs" data-value="media">
                   <Image className="h-3 w-3 mr-1" />
                   Media
                 </TabsTrigger>
                <TabsTrigger value="link" className="text-xs">
                  <Link2 className="h-3 w-3 mr-1" />
                  Link
                </TabsTrigger>
                <TabsTrigger value="poll" className="text-xs">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Poll
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="mt-4">
                <div className="text-center py-4 text-muted-foreground text-sm">
                  <AtSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Use @ to mention people and # to add hashtags
                </div>
              </TabsContent>

              <TabsContent value="media" className="mt-4">
                {!postData.groupId ? (
                  <div className="text-center py-8 space-y-3">
                    <Image className="h-12 w-12 mx-auto text-muted-foreground/50" />
                    <div>
                      <h4 className="font-medium mb-1">Select a group first</h4>
                      <p className="text-muted-foreground text-sm">
                        Choose a group above to start uploading media files
                      </p>
                    </div>
                  </div>
                ) : isDraftLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span className="text-muted-foreground">Setting up media upload...</span>
                  </div>
                ) : currentDraft ? (
                  <EnhancedMediaUpload
                    files={postData.mediaFiles}
                    onFilesChange={(urls) => setPostData(prev => ({ ...prev, mediaFiles: urls }))}
                    draftId={currentDraft.id}
                    groupId={postData.groupId}
                    userId={user.id}
                    disabled={createPostMutation.isPending || isDraftLoading || currentDraft.isLocalFallback}
                  />
                ) : (
                  <div className="text-center py-8 space-y-3">
                    <div className="h-12 w-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                      <Image className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1 text-destructive">Media upload unavailable</h4>
                      <p className="text-muted-foreground text-sm">
                        {draftError || 'There was an issue setting up media upload. Try refreshing the page.'}
                      </p>
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => createOrLoadDraft()}
                        disabled={isDraftLoading}
                      >
                        {isDraftLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Retrying...
                          </>
                        ) : (
                          'Retry Setup'
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.location.reload()}
                      >
                        Refresh Page
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="link" className="mt-4">
                <LinkPreview
                  onPreviewGenerated={(preview) => setPostData(prev => ({ ...prev, linkPreview: preview }))}
                />
              </TabsContent>

              <TabsContent value="poll" className="mt-4">
                <PollCreator
                  onPollCreated={(poll) => setPostData(prev => ({ ...prev, poll }))}
                  currentPoll={postData.poll}
                />
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-between pt-4 border-t border-border/10">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
                 {(postData.content.trim() || postData.title.trim()) && (
                   <Button
                     type="button"
                     variant="ghost"
                     size="sm"
                     onClick={() => saveDraft()}
                     className="text-muted-foreground hover:text-foreground"
                   >
                     Save Draft
                   </Button>
                 )}
              </div>

              <Button
                type="submit"
                disabled={createPostMutation.isPending || !postData.title.trim() || isOverLimit}
                className="bg-primary hover:bg-primary/90 px-6"
              >
                {createPostMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  'Publish'
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};