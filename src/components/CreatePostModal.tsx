import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Image, Video, Link2, BarChart3, Trash2, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUpload } from "./FileUpload";
import { URLValidator } from "./URLValidator";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Group {
  id: string;
  name: string;
  is_public: boolean;
}

interface CreatePostModalProps {
  groups: Group[];
  selectedGroupId?: string;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const CreatePostModal = ({ 
  groups, 
  selectedGroupId, 
  onSuccess, 
  open: externalOpen,
  onOpenChange: externalOnOpenChange 
}: CreatePostModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const isControlled = externalOpen !== undefined;
  const modalOpen = isControlled ? externalOpen : open;
  const handleOpenChange = isControlled ? externalOnOpenChange : setOpen;
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    groupId: selectedGroupId || "",
    mediaType: "" as "image" | "video" | "youtube" | "link" | "file" | "",
    mediaUrl: "",
    pollQuestion: "",
    pollOptions: ["", ""]
  });

  const [urlValidation, setUrlValidation] = useState({ isValid: true, error: "" });
  const [persistedUploads, setPersistedUploads] = useState<{[key: string]: string}>({});

  const addPollOption = () => {
    setFormData({
      ...formData,
      pollOptions: [...formData.pollOptions, ""]
    });
  };

  const removePollOption = (index: number) => {
    if (formData.pollOptions.length > 2) {
      setFormData({
        ...formData,
        pollOptions: formData.pollOptions.filter((_, i) => i !== index)
      });
    }
  };

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...formData.pollOptions];
    newOptions[index] = value;
    setFormData({ ...formData, pollOptions: newOptions });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate media URL if provided
    if (formData.mediaUrl && (!urlValidation.isValid || urlValidation.error)) {
      toast({
        title: "Invalid Media URL",
        description: urlValidation.error || "Please provide a valid media URL.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const postData: any = {
        title: formData.title,
        content: formData.content,
        group_id: formData.groupId,
        user_id: user.id
      };

      // Add media if provided
      if (formData.mediaType && formData.mediaUrl) {
        postData.media_type = formData.mediaType;
        postData.media_url = formData.mediaUrl;
      }

      // Add poll if provided
      if (formData.pollQuestion) {
        postData.poll_question = formData.pollQuestion;
        postData.poll_options = formData.pollOptions.filter(option => option.trim() !== "");
      }

      const { error } = await supabase
        .from("posts")
        .insert(postData);

      if (error) throw error;

      toast({
        title: "Post Created!",
        description: "Your post has been published successfully.",
      });

      setFormData({
        title: "",
        content: "",
        groupId: selectedGroupId || "",
        mediaType: "",
        mediaUrl: "",
        pollQuestion: "",
        pollOptions: ["", ""]
      });
      handleOpenChange?.(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedGroup = groups.find(g => g.id === formData.groupId);

  return (
    <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Create Post
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto border-border/50 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
        <DialogHeader className="pb-6 border-b border-border/10">
          <DialogTitle className="text-xl font-semibold flex items-center gap-3">
            {selectedGroup ? (
              <>
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xl font-semibold">Create Post</div>
                  <div className="text-sm font-normal text-muted-foreground">in {selectedGroup.name}</div>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                Create New Post
              </>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {!selectedGroupId && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Group *</label>
              <Select
                value={formData.groupId}
                onValueChange={(value) => setFormData({ ...formData, groupId: value })}
                required
              >
                <SelectTrigger className="border-border/50 focus:border-primary">
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Title *</label>
            <Input
              placeholder="What's your post about?"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="border-border/50 focus:border-primary text-base py-3"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Content</label>
            <Textarea
              placeholder="Share your thoughts, ideas, or start a discussion..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={5}
              className="border-border/50 focus:border-primary text-base resize-none"
            />
          </div>

          <Tabs defaultValue="text" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-muted">
              <TabsTrigger value="text" className="text-xs">Text</TabsTrigger>
              <TabsTrigger value="media" className="text-xs">Media URL</TabsTrigger>
              <TabsTrigger value="file" className="text-xs">Upload File</TabsTrigger>
              <TabsTrigger value="link" className="text-xs">Link</TabsTrigger>
              <TabsTrigger value="poll" className="text-xs">Poll</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="mt-4">
              <div className="text-center py-4 text-muted-foreground text-sm">
                Your post will contain only text content.
              </div>
            </TabsContent>

            <TabsContent value="media" className="mt-4 space-y-4">
              <div className="text-sm text-muted-foreground">
                Add media via URL (images, videos, YouTube links) or use the Upload File tab for local files.
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Media Type</label>
                <Select
                  value={formData.mediaType}
                  onValueChange={(value: "image" | "video" | "youtube") => 
                    setFormData({ ...formData, mediaType: value })
                  }
                >
                  <SelectTrigger className="border-border/50 focus:border-primary">
                    <SelectValue placeholder="Select media type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">
                      <div className="flex items-center">
                        <Image className="h-4 w-4 mr-2" />
                        Image
                      </div>
                    </SelectItem>
                    <SelectItem value="video">
                      <div className="flex items-center">
                        <Video className="h-4 w-4 mr-2" />
                        Video
                      </div>
                    </SelectItem>
                    <SelectItem value="youtube">
                      <div className="flex items-center">
                        <Video className="h-4 w-4 mr-2" />
                        YouTube
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {formData.mediaType && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Media URL</label>
                  <Input
                    placeholder={
                      formData.mediaType === "youtube" 
                        ? "YouTube video URL" 
                        : `${formData.mediaType} URL`
                    }
                    value={formData.mediaUrl}
                    onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                    className="border-border/50 focus:border-primary"
                  />
                  <URLValidator 
                    url={formData.mediaUrl} 
                    onValidation={(isValid, error) => setUrlValidation({ isValid, error: error || "" })}
                  />
                  {!urlValidation.isValid && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{urlValidation.error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="file" className="mt-4 space-y-4">
              <div className="text-sm text-muted-foreground">
                Upload files directly from your computer. Supported formats: images, videos, documents.
              </div>
              <FileUpload
                onFileUploaded={(url, type) => {
                  setFormData({ 
                    ...formData, 
                    mediaUrl: url,
                    mediaType: "file"
                  });
                  setPersistedUploads({ ...persistedUploads, file: url });
                }}
                onFileRemoved={() => {
                  setFormData({ 
                    ...formData, 
                    mediaUrl: "",
                    mediaType: ""
                  });
                  const newPersisted = { ...persistedUploads };
                  delete newPersisted.file;
                  setPersistedUploads(newPersisted);
                }}
              />
              {persistedUploads.file && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    ✓ File uploaded and ready to publish
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="link" className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Link URL</label>
                <Input
                  placeholder="https://example.com"
                  value={formData.mediaUrl}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    mediaUrl: e.target.value,
                    mediaType: "link"
                  })}
                  className="border-border/50 focus:border-primary"
                />
              </div>
            </TabsContent>

            <TabsContent value="poll" className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Poll Question</label>
                <Input
                  placeholder="What would you like to ask?"
                  value={formData.pollQuestion}
                  onChange={(e) => setFormData({ ...formData, pollQuestion: e.target.value })}
                  className="border-border/50 focus:border-primary"
                />
              </div>
              
              <div className="space-y-3">
                <label className="text-sm font-medium">Poll Options</label>
                {formData.pollOptions.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => updatePollOption(index, e.target.value)}
                      className="border-border/50 focus:border-primary"
                    />
                    {formData.pollOptions.length > 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removePollOption(index)}
                        className="shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addPollOption}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 pt-6 border-t border-border/10">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => handleOpenChange?.(false)} 
              className="flex-1 text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !formData.title.trim()} 
              className="flex-1 bg-primary hover:bg-primary/90 px-8"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Publishing...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Post
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};