import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PostComposer } from "./PostComposer";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface Group {
  id: string;
  name: string;
  is_public: boolean;
}

export const CreatePostButton = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAvailableGroups();
    }
  }, [user]);

  const fetchAvailableGroups = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, is_public')
        .eq('is_approved', true)
        .order('name');

      if (error) throw error;

      setAvailableGroups(data || []);
    } catch (error: any) {
      console.error('Error fetching available groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePostClick = () => {
    if (!user) {
      toast({
        title: "Authentication Required", 
        description: "Please log in to create a post.",
        variant: "destructive",
      });
      return;
    }

    if (availableGroups.length === 0) {
      toast({
        title: "No Groups Available",
        description: "There are no approved groups to post in at the moment.",
        variant: "destructive", 
      });
      return;
    }
    
    setShowDialog(true);
  };

  if (loading) {
    return (
      <Button disabled className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    );
  }

  return (
    <>
      <Button 
        onClick={handleCreatePostClick} 
        className="w-full"
        data-testid="create-post-button"
      >
        <Plus className="h-4 w-4 mr-2" />
        Create Post
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Post</DialogTitle>
          </DialogHeader>
          
          {availableGroups.length > 0 && (
            <PostComposer
              groups={availableGroups}
              startExpanded={true}
              onSuccess={() => {
                setShowDialog(false);
                fetchAvailableGroups();
                window.location.reload(); // Refresh to show new post
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};