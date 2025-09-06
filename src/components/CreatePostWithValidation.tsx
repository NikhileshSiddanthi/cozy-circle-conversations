import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { CreatePostModal } from "./CreatePostModal";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

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
      {!showModal ? (
        <Button onClick={handleCreatePostClick} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Create Post
        </Button>
      ) : (
        <CreatePostModal 
          open={showModal}
          onOpenChange={setShowModal}
          groups={userGroups} 
          onSuccess={() => setShowModal(false)}
        />
      )}
    </>
  );
};