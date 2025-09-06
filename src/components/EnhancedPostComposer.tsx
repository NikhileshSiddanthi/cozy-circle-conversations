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
import { MultiMediaUpload } from "./MultiMediaUpload";
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

  // Auto-save draft
  useEffect(() => {
    if (postData.content.trim() || postData.title.trim()) {
      const timer = setTimeout(() => {
        saveDraft();
      }, DRAFT_SAVE_INTERVAL);

      return () => clearTimeout(timer);
    }
  }, [postData]);

  // Load draft on mount
  useEffect(() => {
    loadDraft();
  }, []);

  const saveDraft = useCallback(async () => {
    if (!user || (!postData.content.trim() && !postData.title.trim())) return;
    
    try {
      localStorage.setItem(`draft_${user.id}`, JSON.stringify({
        ...postData,
        savedAt: new Date().toISOString()
      }));
      setIsDraft(true);
      
      // Show subtle indication
      setTimeout(() => setIsDraft(false), 2000);
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }, [postData, user]);

  const loadDraft = useCallback(() => {
    if (!user) return;
    
    try {
      const saved = localStorage.getItem(`draft_${user.id}`);
      if (saved) {
        const draft = JSON.parse(saved);
        setPostData(draft);
        setCharacterCount(draft.content.length);
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  }, [user]);

  const clearDraft = useCallback(() => {
    if (!user) return;
    localStorage.removeItem(`draft_${user.id}`);
  }, [user]);

  const createPostMutation = useOptimisticMutation({
    mutationFn: async (data: PostData) => {
      console.log('Creating post with data:', data);
      console.log('User:', user);
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      if (!data.groupId) {
        throw new Error('Group not selected');
      }

      const postPayload = {
        title: data.title,
        content: data.content || null,
        group_id: data.groupId,
        user_id: user.id,
        media_type: data.mediaFiles.length > 0 ? 'multiple' : null,
        media_url: data.mediaFiles.length > 0 ? JSON.stringify(data.mediaFiles) : null,
        poll_question: data.poll?.question || null,
        poll_options: data.poll?.options ? data.poll.options : null,
      };

      console.log('Post payload:', postPayload);

      const { data: post, error } = await supabase
        .from('posts')
        .insert(postPayload)
        .select(`
          *,
          profiles:user_id (display_name, avatar_url)
        `)
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Post created successfully:', post);
      return post;
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
                <MultiMediaUpload
                  onFilesUploaded={(urls) => setPostData(prev => ({ ...prev, mediaFiles: urls }))}
                  maxFiles={10}
                  currentFiles={postData.mediaFiles}
                />
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