import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ThumbsUp, ThumbsDown, Reply, MessageCircle, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  content: string;
  like_count: number;
  dislike_count: number;
  created_at: string;
  user_id: string;
  parent_comment_id: string | null;
  profiles: {
    display_name: string | null;
  } | null;
}

interface CommentSectionProps {
  postId: string;
  onCommentAdded?: () => void;
}

export const CommentSection = ({ postId, onCommentAdded }: CommentSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userReactions, setUserReactions] = useState<Record<string, "like" | "dislike">>({});

  useEffect(() => {
    fetchComments();
  }, [postId]);

  useEffect(() => {
    if (user) {
      fetchUserReactions();
    }
  }, [user, comments]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load comments",
        variant: "destructive",
      });
      return;
    }

    // Get user profiles for comments
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      const commentsWithProfiles = data.map(comment => ({
        ...comment,
        profiles: profileMap.get(comment.user_id) || null
      }));

      setComments(commentsWithProfiles);
    } else {
      setComments((data || []).map(comment => ({
        ...comment,
        profiles: null
      })));
    }
  };

  const fetchUserReactions = async () => {
    if (!user || comments.length === 0) return;

    const commentIds = comments.map(c => c.id);
    const { data } = await supabase
      .from("reactions")
      .select("comment_id, reaction_type")
      .in("comment_id", commentIds)
      .eq("user_id", user.id);

    if (data) {
      const reactions: Record<string, "like" | "dislike"> = {};
      data.forEach(reaction => {
        if (reaction.comment_id) {
          reactions[reaction.comment_id] = reaction.reaction_type as "like" | "dislike";
        }
      });
      setUserReactions(reactions);
    }
  };

  const handleAddComment = async (parentId: string | null = null) => {
    if (!user) return;
    
    const content = parentId ? replyContent : newComment;
    if (!content.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          content: content.trim(),
          parent_comment_id: parentId
        });

      if (error) throw error;

      if (parentId) {
        setReplyContent("");
        setReplyTo(null);
      } else {
        setNewComment("");
      }

      await fetchComments();
      onCommentAdded?.();

      toast({
        title: "Comment Added!",
        description: "Your comment has been posted.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReaction = async (commentId: string, type: "like" | "dislike") => {
    if (!user) return;

    try {
      const currentReaction = userReactions[commentId];
      
      // Remove existing reaction if same type
      if (currentReaction === type) {
        await supabase
          .from("reactions")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id)
          .eq("reaction_type", type);
        
        setUserReactions(prev => {
          const newReactions = { ...prev };
          delete newReactions[commentId];
          return newReactions;
        });
      } else {
        // Delete existing reaction and insert new one
        await supabase
          .from("reactions")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);

        await supabase
          .from("reactions")
          .insert({
            comment_id: commentId,
            user_id: user.id,
            reaction_type: type
          });

        setUserReactions(prev => ({
          ...prev,
          [commentId]: type
        }));
      }

      await fetchComments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update reaction",
        variant: "destructive",
      });
    }
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => (
    <div key={comment.id} className={`space-y-3 ${isReply ? "ml-8 pl-4 border-l-2 border-muted" : ""}`}>
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {comment.profiles?.display_name?.[0] || "U"}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              {comment.profiles?.display_name || "Anonymous"}
            </span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{comment.content}</p>
          
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReaction(comment.id, "like")}
              className={`h-auto p-1 ${userReactions[comment.id] === "like" ? "text-primary" : ""}`}
            >
              <ThumbsUp className="h-3 w-3 mr-1" />
              <span className="text-xs">{comment.like_count}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReaction(comment.id, "dislike")}
              className={`h-auto p-1 ${userReactions[comment.id] === "dislike" ? "text-destructive" : ""}`}
            >
              <ThumbsDown className="h-3 w-3 mr-1" />
              <span className="text-xs">{comment.dislike_count}</span>
            </Button>
            
            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                className="h-auto p-1"
              >
                <Reply className="h-3 w-3 mr-1" />
                <span className="text-xs">Reply</span>
              </Button>
            )}
          </div>

          {replyTo === comment.id && (
            <div className="mt-3 space-y-2">
              <Textarea
                placeholder="Write a reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAddComment(comment.id)}
                  disabled={isLoading || !replyContent.trim()}
                >
                  Reply
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setReplyTo(null);
                    setReplyContent("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Render replies */}
      {comments
        .filter(c => c.parent_comment_id === comment.id)
        .map(reply => renderComment(reply, true))
      }
    </div>
  );

  const topLevelComments = comments.filter(c => !c.parent_comment_id);

  return (
    <div className="space-y-4 pt-4 border-t">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4" />
        <span className="font-medium">Comments ({comments.length})</span>
      </div>

      {/* Add new comment */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {user?.email?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Textarea
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => handleAddComment()}
            disabled={isLoading || !newComment.trim()}
            size="sm"
          >
            {isLoading ? "Posting..." : "Comment"}
          </Button>
        </div>
      </div>

      {/* Display comments */}
      <div className="space-y-4">
        {topLevelComments.map(comment => renderComment(comment))}
      </div>

      {comments.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No comments yet. Be the first to comment!</p>
        </div>
      )}
    </div>
  );
};