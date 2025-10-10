import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Sparkles } from "lucide-react";
import { useIconGenerator } from "@/hooks/useIconGenerator";
import { Badge } from "@/components/ui/badge";

interface Category {
  id: string;
  name: string;
}

interface SuggestGroupModalProps {
  categories?: Category[];
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const SuggestGroupModal = ({ categories = [], onSuccess, open: controlledOpen, onOpenChange }: SuggestGroupModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Use controlled open state if provided, otherwise use internal
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    categoryId: "",
    type: "topic" as "topic" | "personality" | "institutional",
    isPublic: true,
    inviteEmails: "",
    icon: "Users" // Store generated icon
  });

  // Use AI to generate icon suggestion based on group name
  const { icon: suggestedIcon, loading: generatingIcon } = useIconGenerator(
    formData.name, 
    'group'
  );

  // Auto-update icon when AI suggests a new one
  useEffect(() => {
    if (suggestedIcon && formData.name) {
      setFormData(prev => ({ ...prev, icon: suggestedIcon }));
    }
  }, [suggestedIcon, formData.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to suggest a group.",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!formData.name.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a group name.",
        variant: "destructive",
      });
      return;
    }

    // Category is no longer required - admin will assign it

    setIsLoading(true);
    try {
      // Create the group suggestion
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert({
          name: formData.name,
          description: formData.description,
          category_id: formData.categoryId || null, // Admin will assign category
          type: formData.type,
          creator_id: user.id,
          is_approved: false,
          is_public: formData.isPublic
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Get all admin users to notify
      const { data: adminRoles, error: adminError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminError) throw adminError;

      // Create notifications for all admins
      if (adminRoles && adminRoles.length > 0) {
        const notifications = adminRoles.map(admin => ({
          user_id: admin.user_id,
          type: "group_suggestion",
          title: "New Group Suggestion",
          message: `${user.email || 'A user'} suggested a new group: "${formData.name}"`,
          data: { 
            group_id: group.id,
            group_name: formData.name,
            suggester_email: user.email 
          }
        }));

        const { error: notificationError } = await supabase
          .from("notifications")
          .insert(notifications);

        if (notificationError) throw notificationError;
      }

      toast({
        title: "Group Suggested!",
        description: "Your group suggestion has been sent to administrators for approval.",
      });

      setFormData({ name: "", description: "", categoryId: "", type: "topic", isPublic: true, inviteEmails: "", icon: "Users" });
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to suggest group",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Suggest Group
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Suggest a New Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium flex items-center gap-2">
              Group Name
              {generatingIcon && (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI Generating Icon...
                </Badge>
              )}
            </label>
            <Input
              placeholder="e.g., Trump Discussion, Prof. Rao Group, YSC School"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            {formData.name && (
              <p className="text-xs text-muted-foreground mt-1">
                <Sparkles className="h-3 w-3 inline mr-1" />
                AI will suggest a relevant icon for this group
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Describe what this group is about..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Category (Optional)</label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Admin will assign appropriate category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Administrators will assign the most appropriate category for your group.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Group Type</label>
            <Select
              value={formData.type}
              onValueChange={(value: "topic" | "personality" | "institutional") => 
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="topic">Topic-based (e.g., Trump Discussion)</SelectItem>
                <SelectItem value="personality">Personality-driven (e.g., Prof. Rao Group)</SelectItem>
                <SelectItem value="institutional">Institutional (e.g., YSC School)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is-public" className="text-sm font-medium">
              Public Group
            </Label>
            <Switch
              id="is-public"
              checked={formData.isPublic}
              onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {formData.isPublic 
              ? "Public groups are visible to everyone and anyone can request to join"
              : "Private groups are only visible to members and require invitation to join"
            }
          </p>

          {!formData.isPublic && (
            <div>
              <label className="text-sm font-medium">Invite Members (Optional)</label>
              <Textarea
                placeholder="Enter email addresses separated by commas to invite initial members..."
                value={formData.inviteEmails}
                onChange={(e) => setFormData({ ...formData, inviteEmails: e.target.value })}
                rows={2}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Initial invitations will be sent once the group is approved by administrators.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Suggesting..." : "Submit Suggestion"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};