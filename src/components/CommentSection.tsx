import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Heart, Reply, MessageCircle, Calendar, Sparkles, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { EditableComment } from "./EditableComment";
import { useUserRole } from "@/hooks/useUserRole";

interface Comment {
  id: string;
  content: string;
  like_count: number;
  dislike_count: number;
  created_at: string;
  user_id: string;
  parent_comment_id: string | null;
  is_edited?: boolean;
  edited_at?: string | null;
  profiles: {
    display_name: string | null;
  } | null;
}

interface CommentSectionProps {
  postId: string;
  onCommentAdded?: () => void;
  postTitle?: string;
  postContent?: string;
  groupName?: string;
  categoryName?: string;
}

export const CommentSection = ({ postId, onCommentAdded, postTitle, postContent, groupName, categoryName }: CommentSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { role: userRole } = useUserRole();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userReactions, setUserReactions] = useState<Record<string, boolean>>({});
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);

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
      .eq("user_id", user.id)
      .eq("reaction_type", "like");

    if (data) {
      const reactions: Record<string, boolean> = {};
      data.forEach(reaction => {
        if (reaction.comment_id) {
          reactions[reaction.comment_id] = true;
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

  const toggleReaction = async (commentId: string) => {
    if (!user) return;

    try {
      const isLiked = !!userReactions[commentId];

      if (isLiked) {
        await supabase
          .from("reactions")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id)
          .eq("reaction_type", "like");

        setUserReactions(prev => {
          const next = { ...prev };
          delete next[commentId];
          return next;
        });
      } else {
        // Clean up any legacy reaction rows for this user/comment then insert like
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
            reaction_type: "like"
          });

        setUserReactions(prev => ({
          ...prev,
          [commentId]: true
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

  const handleGetAISuggestion = async () => {
    if (!user) return;
    
    setIsGeneratingSuggestion(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-comment', {
        body: { 
          postTitle: postTitle || '',
          postContent: postContent || '',
          groupName: groupName || '',
          categoryName: categoryName || ''
        }
      });

      if (error) throw error;

      setNewComment(data.suggestion);
      toast({
        title: "AI Suggestion Generated",
        description: "Review and edit the suggestion before posting.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate suggestion",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSuggestion(false);
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
              {comment.profiles?.display_name || "User"}
            </span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </div>
          </div>

          <EditableComment
            comment={comment}
            onUpdate={fetchComments}
            isAuthor={user?.id === comment.user_id}
            isAdmin={userRole === 'admin'}
          />

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleReaction(comment.id)}
              className={`h-auto p-1 ${userReactions[comment.id] ? "text-primary" : ""}`}
            >
              <Heart className="h-3 w-3 mr-1" fill={userReactions[comment.id] ? "currentColor" : "none"} />
              <span className="text-xs">{comment.like_count}</span>
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

          {/* Render replies */}
          {comments
            .filter(c => c.parent_comment_id === comment.id)
            .map(reply => renderComment(reply, true))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback>
            {user?.email?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Textarea
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              Be respectful and keep discussions constructive.
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleGetAISuggestion}
                disabled={isGeneratingSuggestion || !postContent}
              >
                {isGeneratingSuggestion ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />AI Suggest</>
                )}
              </Button>
              <Button onClick={() => handleAddComment()} disabled={isLoading || !newComment.trim()}>
                Comment
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {comments
          .filter(c => !c.parent_comment_id)
          .map(comment => renderComment(comment))}
      </div>
    </div>
  );
};