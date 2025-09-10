import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { PostComposer } from "./PostComposer";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Group {
  id: string;
  name: string;
  is_public: boolean;
}

interface CreatePostWithValidationProps {
  userGroups: Group[];
}

export const CreatePostWithValidation = ({ userGroups }: CreatePostWithValidationProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);

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

    setShowModal(true);
  };

  if (!user || userGroups.length === 0) {
    return (
      <Button onClick={handleCreatePostClick} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Create Post
      </Button>
    );
  }

  return (
    <>
      <Button onClick={handleCreatePostClick} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Create Post
      </Button>
      
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Post</DialogTitle>
          </DialogHeader>
          <PostComposer
            groups={userGroups}
            onSuccess={() => setShowModal(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};