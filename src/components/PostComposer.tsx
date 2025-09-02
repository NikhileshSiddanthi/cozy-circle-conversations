import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Image, Video, FileText, BarChart3 } from "lucide-react";
import { CreatePostModal } from "./CreatePostModal";

interface Group {
  id: string;
  name: string;
}

interface PostComposerProps {
  groups: Group[];
  selectedGroupId?: string;
  onSuccess?: () => void;
}

export const PostComposer = ({ groups, selectedGroupId, onSuccess }: PostComposerProps) => {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  if (!user) return null;

  const userInitials = user.email?.charAt(0).toUpperCase() || "U";

  return (
    <>
      <Card className="border-border/50 bg-card hover:shadow-md transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* User Avatar */}
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {userInitials}
              </AvatarFallback>
            </Avatar>

            {/* Composer Input */}
            <div 
              className="flex-1 bg-muted/30 border border-border/50 rounded-xl px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors duration-200"
              onClick={() => setModalOpen(true)}
            >
              <p className="text-muted-foreground text-sm">
                Share your thoughts...
              </p>
            </div>

            {/* Quick Action Icons */}
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="h-9 w-9 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={() => setModalOpen(true)}
              >
                <Image className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-9 w-9 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={() => setModalOpen(true)}
              >
                <Video className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-9 w-9 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={() => setModalOpen(true)}
              >
                <FileText className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-9 w-9 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={() => setModalOpen(true)}
              >
                <BarChart3 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <CreatePostModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        groups={groups}
        selectedGroupId={selectedGroupId}
        onSuccess={() => {
          setModalOpen(false);
          onSuccess?.();
        }}
      />
    </>
  );
};