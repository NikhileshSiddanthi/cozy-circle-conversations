import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CreatePostModal } from "./CreatePostModal";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface Group {
  id: string;
  name: string;
}

export const CreatePostButton = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

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
          groups!inner(id, name, is_approved)
        `)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .eq('groups.is_approved', true);

      if (error) throw error;

      const groups = data?.map(item => ({
        id: item.groups.id,
        name: item.groups.name
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
      return false;
    }

    if (userGroups.length === 0) {
      toast({
        title: "Join a Group First",
        description: "You need to join and be approved in at least one group to create posts.",
        variant: "destructive", 
      });
      return false;
    }
    
    return true;
  };

  if (loading) {
    return (
      <Button disabled className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    );
  }

  if (!user || userGroups.length === 0) {
    return (
      <Button onClick={handleCreatePostClick} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Create Post
      </Button>
    );
  }

  return (
    <CreatePostModal 
      groups={userGroups} 
      onSuccess={fetchUserGroups}
    />
  );
};