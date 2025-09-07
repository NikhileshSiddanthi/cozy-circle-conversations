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
  Loader2,
  Link as LinkIcon
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MediaUpload } from "./MediaUpload";
import { URLPreview } from "./URLPreview";

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
  
  const [formData, setFormData] = useState({
    title: editPost?.title || "",
    content: editPost?.content || "",
    groupId: selectedGroupId || "",
    mediaFiles: editPost?.media_urls || [],
    linkPreview: ""
  });

  const MAX_CHARACTERS = 5000;
  const characterCount = formData.content.length;
  const isOverLimit = characterCount > MAX_CHARACTERS;

  const resetForm = useCallback(() => {
    setFormData({
      title: "",
      content: "",
      groupId: selectedGroupId || "",
      mediaFiles: [],
      linkPreview: ""
    });
    setIsExpanded(false);
    setCurrentTab("text");
  }, [selectedGroupId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mediaUploading) {
      toast({
        title: "Please wait",
        description: "Media files are still uploading.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.title.trim()) {
      toast({
        title: "Title Required",
        description: "Please add a title to your post.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.content.trim() && !formData.mediaFiles.length) {
      toast({
        title: "Content Required",
        description: "Please add content or media to your post.",
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

    setIsSubmitting(true);

    try {
      const postData = {
        user_id: user!.id,
        group_id: formData.groupId,
        title: formData.title.trim(),
        content: formData.content.trim() || "",
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

      // Insert media files
      if (formData.mediaFiles.length > 0) {
        const mediaInserts = formData.mediaFiles.map((url, index) => ({
          post_id: post.id,
          user_id: user!.id,
          file_id: `media_${post.id}_${index}`,
          url: url,
          mime_type: 'image/jpeg',
          order_index: index,
          status: 'attached'
        }));

        const { error: mediaError } = await supabase
          .from('post_media')
          .insert(mediaInserts);

        if (mediaError) {
          await supabase.from('posts').delete().eq('id', post.id);
          throw mediaError;
        }
      }

      toast({
        title: "Post Published",
        description: "Your post has been successfully published!"
      });

      resetForm();
      onSuccess();
      
    } catch (error) {
      console.error('Post submission error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit post.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <Card className="border-border/50 bg-card">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Please sign in to create posts</p>
        </CardContent>
      </Card>
    );
  }

  const userInitials = user.email?.charAt(0).toUpperCase() || "U";

  return (
    <Card className="border-border/50 bg-card hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        {!isExpanded ? (
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.user_metadata?.avatar_url} alt="Your avatar" />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div 
              className="flex-1 p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={() => setIsExpanded(true)}
              data-testid="create-post-button"
            >
              <p className="text-muted-foreground">What's on your mind?</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setIsExpanded(true); setCurrentTab("media"); }}>
                <Image className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setIsExpanded(true); setCurrentTab("link"); }}>
                <LinkIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
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
                   {selectedGroupId ? (
                     <>
                       <span className="text-muted-foreground">•</span>
                       <span className="text-sm text-muted-foreground">
                         posting to {groups.find(g => g.id === selectedGroupId)?.name}
                       </span>
                     </>
                   ) : (
                     <>
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
                     </>
                   )}
                 </div>
              </div>
            </div>

            <Input
              placeholder="Post title *"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="border-0 bg-transparent text-lg font-medium placeholder:text-muted-foreground focus-visible:ring-0 px-0"
              data-testid="title-input"
              required
            />

            <Tabs value={currentTab} onValueChange={setCurrentTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="text">Text</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
                <TabsTrigger value="link">Link</TabsTrigger>
              </TabsList>
              
              <TabsContent value="text" className="mt-4">
                <Textarea
                  placeholder="Share your thoughts..."
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="border-0 bg-transparent resize-none min-h-[120px] placeholder:text-muted-foreground focus-visible:ring-0 px-0"
                  data-testid="content-textarea"
                />
              </TabsContent>
              
              <TabsContent value="media" className="mt-4">
                <MediaUpload
                  files={formData.mediaFiles}
                  onFilesChange={(files) => setFormData(prev => ({ ...prev, mediaFiles: files }))}
                  onUploadStatusChange={setMediaUploading}
                  maxFiles={10}
                />
              </TabsContent>
              
              <TabsContent value="link" className="mt-4">
                <div className="space-y-4">
                  <Input
                    placeholder="Paste a URL to show preview"
                    value={formData.linkPreview}
                    onChange={(e) => setFormData(prev => ({ ...prev, linkPreview: e.target.value }))}
                    className="w-full"
                  />
                  {formData.linkPreview && (
                    <URLPreview 
                      url={formData.linkPreview}
                      onRemove={() => setFormData(prev => ({ ...prev, linkPreview: "" }))}
                    />
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Media: {formData.mediaFiles.length}/10
              </div>
              
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={resetForm} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || mediaUploading || isOverLimit}
                  data-testid="publish-button"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Publishing...
                    </>
                  ) : mediaUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Publish
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