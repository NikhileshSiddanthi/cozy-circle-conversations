import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Image, 
  Video, 
  Send,
  Loader2
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MediaUpload } from "./MediaUpload";

interface Group {
  id: string;
  name: string;
  is_public: boolean;
}

interface PostComposerProps {
  groups: Group[];
  selectedGroupId?: string;
  onSuccess: () => void;
  editPost?: {
    id: string;
    title: string;
    content: string;
    media_urls: string[];
  };
}

export const PostComposer = ({ groups, selectedGroupId, onSuccess, editPost }: PostComposerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(!!editPost);
  const [currentTab, setCurrentTab] = useState("text");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [formData, setFormData] = useState({
    title: editPost?.title || "",
    content: editPost?.content || "",
    groupId: selectedGroupId || editPost ? "" : "",
    mediaFiles: editPost?.media_urls || []
  });

  const MAX_CHARACTERS = 5000;
  const characterCount = formData.content.length;
  const isOverLimit = characterCount > MAX_CHARACTERS;

  useEffect(() => {
    if (editPost && groups.length > 0) {
      // For edit mode, we need to find the group from the post data
      // This would typically come from the post data passed in
      setFormData(prev => ({
        ...prev,
        groupId: selectedGroupId || groups[0]?.id || ""
      }));
    }
  }, [editPost, groups, selectedGroupId]);

  const resetForm = useCallback(() => {
    setFormData({
      title: "",
      content: "",
      groupId: selectedGroupId || "",
      mediaFiles: []
    });
    setIsExpanded(false);
    setCurrentTab("text");
  }, [selectedGroupId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mediaUploading) {
      toast({
        title: "Please wait",
        description: "Media files are still uploading. Please wait before publishing.",
        variant: "destructive"
      });
      return;
    }

    // Validate content - must have title OR content OR media
    const hasTitle = formData.title.trim().length > 0;
    const hasContent = formData.content.trim().length > 0;
    const hasMedia = formData.mediaFiles.length > 0;
    
    if (!hasTitle && !hasContent && !hasMedia) {
      toast({
        title: "Content Required",
        description: "Please add a title, content, or media to your post.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.groupId) {
      toast({
        title: "Group Required",
        description: "Please select a group for your post.",
        variant: "destructive",
      });
      return;
    }

    if (isOverLimit) {
      toast({
        title: "Post Too Long",
        description: `Please reduce your post to under ${MAX_CHARACTERS} characters`,
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (editPost) {
        // Edit existing post
        const response = await supabase.functions.invoke('edit-post', {
          body: {
            postId: editPost.id,
            title: formData.title || undefined,
            content: formData.content || undefined,
            mediaFiles: formData.mediaFiles.length > 0 ? formData.mediaFiles : undefined
          }
        });

        if (response.error) {
          throw new Error(response.error.message || 'Failed to edit post');
        }

        toast({
          title: "Post Updated",
          description: "Your post has been successfully updated."
        });
      } else {
        // Create new post
        const postData: any = {
          user_id: user!.id,
          group_id: formData.groupId,
          title: formData.title || "Untitled Post",
          content: formData.content || "",
          media_type: formData.mediaFiles.length > 1 ? 'multiple' : 
                     formData.mediaFiles.length === 1 ? 'image' : null,
          media_url: formData.mediaFiles.length > 0 ? formData.mediaFiles[0] : null
        };

        const { data: post, error: postError } = await supabase
          .from('posts')
          .insert(postData)
          .select()
          .single();

        if (postError) throw postError;

        // Insert media files if any
        if (formData.mediaFiles.length > 0) {
          const mediaInserts = formData.mediaFiles.map((url, index) => ({
            post_id: post.id,
            user_id: user!.id,
            file_id: `media_${post.id}_${index}`,
            url: url,
            mime_type: url.includes('.mp4') || url.includes('.webm') ? 'video/mp4' : 'image/jpeg',
            order_index: index,
            status: 'attached'
          }));

          const { error: mediaError } = await supabase
            .from('post_media')
            .insert(mediaInserts);

          if (mediaError) {
            // Rollback post if media fails
            await supabase.from('posts').delete().eq('id', post.id);
            throw mediaError;
          }
        }

        toast({
          title: "Post Published",
          description: "Your post has been successfully published!"
        });
      }

      resetForm();
      onSuccess();
      
    } catch (error) {
      console.error('Post submission error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit post. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  const selectedGroup = groups.find(g => g.id === formData.groupId);
  const userInitials = user.email?.charAt(0).toUpperCase() || "U";

  return (
    <Card className="border-border/50 bg-card hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        {!isExpanded ? (
          // Inline composer
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.user_metadata?.avatar_url} alt="Your avatar" />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div 
              className="flex-1 p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={() => setIsExpanded(true)}
            >
              <p className="text-muted-foreground">
                {editPost ? "Edit your post..." : "What's on your mind?"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsExpanded(true);
                  setCurrentTab("media");
                }}
              >
                <Image className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsExpanded(true);
                  setCurrentTab("media");
                }}
              >
                <Video className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          // Expanded composer
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="post-composer-expanded">
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.user_metadata?.avatar_url} alt="Your avatar" />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-sm">
                    {user.user_metadata?.display_name || user.email?.split('@')[0] || 'You'}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <Select
                    value={formData.groupId}
                    onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, groupId: value }))
                    }
                  >
                    <SelectTrigger className="w-48 h-8">
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map(group => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Input
                placeholder="Post title (optional)"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="border-0 bg-transparent text-lg font-medium placeholder:text-muted-foreground focus-visible:ring-0 px-0"
                data-testid="title-input"
              />

              <Tabs value={currentTab} onValueChange={setCurrentTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text">Text</TabsTrigger>
                  <TabsTrigger value="media">Media</TabsTrigger>
                </TabsList>
                
                <TabsContent value="text" className="mt-4">
                  <Textarea
                    ref={textareaRef}
                    placeholder="Share your thoughts..."
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    className="border-0 bg-transparent resize-none min-h-[120px] placeholder:text-muted-foreground focus-visible:ring-0 px-0"
                    data-testid="content-textarea"
                  />
                  
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-xs text-muted-foreground">
                      {characterCount > MAX_CHARACTERS * 0.8 && (
                        <span className={isOverLimit ? "text-destructive" : "text-warning"}>
                          {characterCount}/{MAX_CHARACTERS}
                        </span>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="media" className="mt-4">
                  <MediaUpload
                    files={formData.mediaFiles}
                    onFilesChange={(files) => setFormData(prev => ({ ...prev, mediaFiles: files }))}
                    onUploadStatusChange={setMediaUploading}
                    maxFiles={10}
                  />
                </TabsContent>
              </Tabs>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {selectedGroup && (
                  <span>Posting to {selectedGroup.name}</span>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetForm}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || mediaUploading || isOverLimit}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {editPost ? "Updating..." : "Publishing..."}
                    </>
                  ) : mediaUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Uploading Media...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {editPost ? "Update" : "Publish"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};