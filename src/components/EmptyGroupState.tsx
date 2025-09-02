import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles } from "lucide-react";

interface EmptyGroupStateProps {
  isMember: boolean;
  onCreatePost: () => void;
}

export const EmptyGroupState = ({ isMember, onCreatePost }: EmptyGroupStateProps) => {
  return (
    <Card className="border-dashed border-2 border-muted-foreground/20 bg-muted/5">
      <CardContent className="text-center py-12">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <MessageCircle className="h-16 w-16 text-muted-foreground/40" />
            <Sparkles className="h-6 w-6 text-primary absolute -top-1 -right-1 animate-pulse" />
          </div>
        </div>
        
        <h3 className="text-xl font-semibold mb-3 text-foreground">
          No posts yet 🎉
        </h3>
        
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          {isMember 
            ? "Be the first to start a discussion in this group! Share your thoughts, ask questions, or start a conversation."
            : "Join this group to see posts and participate in discussions with other members."
          }
        </p>

        {isMember && (
          <Button 
            onClick={onCreatePost}
            size="lg"
            className="px-8"
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Create Post
          </Button>
        )}
      </CardContent>
    </Card>
  );
};