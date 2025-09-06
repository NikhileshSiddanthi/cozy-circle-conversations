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
import { MediaUploadTab } from "./MediaUploadTab";
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

  const createOrLoadDraft = useCallback(async () => {
    if (!user || !postData.groupId) return;
    
    setIsDraftLoading(true);
    try {
      // Load existing draft for this group using GET request
      const response = await fetch(`https://zsquagqhilzjumfjxusk.supabase.co/functions/v1/draft-manager/drafts?groupId=${postData.groupId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcXVhZ3FoaWx6anVtZmp4dXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMjA5MDMsImV4cCI6MjA2OTY5NjkwM30.HF6dfD8LhicG73SMomqcZO-8DD5GN9YPX8W6sh4DcFI`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcXVhZ3FoaWx6anVtZmp4dXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMjA5MDMsImV4cCI6MjA2OTY5NjkwM30.HF6dfD8LhicG73SMomqcZO-8DD5GN9YPX8W6sh4DcFI',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Error loading drafts:', response.statusText);
        await createNewDraft();
        return;
      }

      const data = await response.json();
      const existingDraft = data.drafts.find((d: any) => d.group_id === postData.groupId);

      if (existingDraft) {
        // Load existing draft
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
      await createNewDraft();
    } finally {
      setIsDraftLoading(false);
    }
  }, [user, postData.groupId]);

  const createNewDraft = useCallback(async () => {
    if (!user || !postData.groupId) return;

    try {
      // Get user session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session');
      }

      const response = await fetch(`https://zsquagqhilzjumfjxusk.supabase.co/functions/v1/draft-manager/drafts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcXVhZ3FoaWx6anVtZmp4dXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMjA5MDMsImV4cCI6MjA2OTY5NjkwM30.HF6dfD8LhicG73SMomqcZO-8DD5GN9YPX8W6sh4DcFI',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupId: postData.groupId,
          title: '',
          content: '',
          metadata: {}
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create draft: ${response.statusText}`);
      }

      const data = await response.json();
      setCurrentDraft(data.draft);
    } catch (error) {
      console.error('Failed to create new draft:', error);
    }
  }, [user, postData.groupId]);

  const saveDraft = useCallback(async () => {
    if (!currentDraft || !user || (!postData.content.trim() && !postData.title.trim())) return;
    
    try {
      // Get user session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session');
      }

      const response = await fetch(`https://zsquagqhilzjumfjxusk.supabase.co/functions/v1/draft-manager/drafts/${currentDraft.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcXVhZ3FoaWx6anVtZmp4dXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMjA5MDMsImV4cCI6MjA2OTY5NjkwM30.HF6dfD8LhicG73SMomqcZO-8DD5GN9YPX8W6sh4DcFI',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: postData.title,
          content: postData.content,
          metadata: {
            mentions: postData.mentions,
            hashtags: postData.hashtags
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to save draft: ${response.statusText}`);
      }
      
      setIsDraft(true);
      setTimeout(() => setIsDraft(false), 2000);
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }, [postData, user, currentDraft]);

  const clearDraft = useCallback(async () => {
    if (!currentDraft || !user) return;
    
    try {
      // Get user session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session');
      }

      const response = await fetch(`https://zsquagqhilzjumfjxusk.supabase.co/functions/v1/draft-manager/drafts/${currentDraft.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcXVhZ3FoaWx6anVtZmp4dXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMjA5MDMsImV4cCI6MjA2OTY5NjkwM30.HF6dfD8LhicG73SMomqcZO-8DD5GN9YPX8W6sh4DcFI',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete draft: ${response.statusText}`);
      }

      setCurrentDraft(null);
    } catch (error) {
      console.error('Failed to delete draft:', error);
    }
  }, [user, currentDraft]);

  const createPostMutation = useOptimisticMutation({
    mutationFn: async (data: PostData) => {
      if (!user || !currentDraft) {
        throw new Error('User not authenticated or no draft available');
      }
      
      if (!data.groupId) {
        throw new Error('Group not selected');
      }

      // Use the publish-post edge function to atomically publish the draft
      const { data: result, error } = await supabase.functions.invoke('publish-post', {
        body: {
          draftId: currentDraft.id,
          groupId: data.groupId
        }
      });

      if (error) {
        console.error('Publish error:', error);
        throw new Error(`Failed to publish post: ${error.message}`);
      }
      
      console.log('Post published successfully:', result.post);
      return result.post;
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!postData.title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for your post.",
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
          <form onSubmit={handleSubmit} className="space-y-4">
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
              onChange={(e) => setPostData(prev => ({ ...prev, title: e.target.value }))}
              className="border-border/50 focus:border-primary text-base py-3 font-medium"
              required
            />

            <div className="space-y-3">
              <RichTextEditor
                value={postData.content}
                onChange={updateContent}
                placeholder="Share your thoughts, ideas, or start a discussion..."
                maxLength={MAX_CHARACTERS}
                showToolbar
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
                <TabsTrigger value="media" className="text-xs">
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
                  <MediaUploadTab
                    files={postData.mediaFiles}
                    onFilesChange={(urls) => setPostData(prev => ({ ...prev, mediaFiles: urls }))}
                    draftId={currentDraft.id}
                    groupId={postData.groupId}
                    userId={user.id}
                  />
                ) : (
                  <div className="text-center py-8 space-y-3">
                    <div className="h-12 w-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                      <Image className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-1 text-destructive">Media upload unavailable</h4>
                      <p className="text-muted-foreground text-sm">
                        There was an issue setting up media upload. Try refreshing the page.
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.reload()}
                    >
                      Refresh Page
                    </Button>
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
                    onClick={saveDraft}
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