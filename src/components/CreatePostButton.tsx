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
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserGroups();
    }
  }, [user]);

  const fetchUserGroups = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups!inner(id, name, is_public, is_approved)
        `)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .eq('groups.is_approved', true);

      if (error) throw error;

      const groups = data?.map(item => ({
        id: item.groups.id,
        name: item.groups.name,
        is_public: item.groups.is_public
      })) || [];

      setUserGroups(groups);
    } catch (error: any) {
      console.error('Error fetching user groups:', error);
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

    if (userGroups.length === 0) {
      toast({
        title: "Join a Group First",
        description: "You need to join and be approved in at least one group to create posts.",
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
          
          {userGroups.length > 0 && (
            <PostComposer
              groups={userGroups}
              startExpanded={true}
              onSuccess={() => {
                setShowDialog(false);
                fetchUserGroups();
                window.location.reload(); // Refresh to show new post
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};