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

  return (
    <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Create Post
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Post</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Group</label>
            <Select
              value={formData.groupId}
              onValueChange={(value) => setFormData({ ...formData, groupId: value })}
              required
            >
              <SelectTrigger>
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

          <div>
            <label className="text-sm font-medium">Title *</label>
            <Input
              placeholder="What's your post about?"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Content</label>
            <Textarea
              placeholder="Share your thoughts..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={4}
            />
          </div>

            <Tabs defaultValue="text" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="text">Text</TabsTrigger>
              <TabsTrigger value="media">Media URL</TabsTrigger>
              <TabsTrigger value="file">Upload File</TabsTrigger>
              <TabsTrigger value="link">Link</TabsTrigger>
              <TabsTrigger value="poll">Poll</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="mt-4">
              <p className="text-sm text-muted-foreground">Your post will contain only text content.</p>
            </TabsContent>

            <TabsContent value="media" className="mt-4 space-y-3">
              <div className="text-sm text-muted-foreground mb-4">
                Add media via URL (images, videos, YouTube links) or use the Upload File tab for local files.
              </div>
              <div>
                <label className="text-sm font-medium">Media Type</label>
                <Select
                  value={formData.mediaType}
                  onValueChange={(value: "image" | "video" | "youtube") => 
                    setFormData({ ...formData, mediaType: value })
                  }
                >
                  <SelectTrigger>
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
                <div>
                  <label className="text-sm font-medium">Media URL</label>
                  <Input
                    placeholder={
                      formData.mediaType === "youtube" 
                        ? "YouTube video URL" 
                        : `${formData.mediaType} URL`
                    }
                    value={formData.mediaUrl}
                    onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
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

            <TabsContent value="file" className="mt-4 space-y-3">
              <div className="text-sm text-muted-foreground mb-4">
                Upload files directly from your computer. Supported formats: images, videos, documents.
              </div>
              <FileUpload
                onFileUploaded={(url, type) => {
                  setFormData({ 
                    ...formData, 
                    mediaUrl: url,
                    mediaType: "file"
                  });
                  // Persist upload across tab changes
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
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✓ File uploaded and ready to publish: {persistedUploads.file}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="link" className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-medium">Link URL</label>
                <Input
                  placeholder="https://example.com"
                  value={formData.mediaUrl}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    mediaUrl: e.target.value,
                    mediaType: "link"
                  })}
                />
              </div>
            </TabsContent>

            <TabsContent value="poll" className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-medium">Poll Question</label>
                <Input
                  placeholder="What would you like to ask?"
                  value={formData.pollQuestion}
                  onChange={(e) => setFormData({ ...formData, pollQuestion: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Poll Options</label>
                {formData.pollOptions.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => updatePollOption(index, e.target.value)}
                    />
                    {formData.pollOptions.length > 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removePollOption(index)}
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

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange?.(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Publishing..." : "Publish Post"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};