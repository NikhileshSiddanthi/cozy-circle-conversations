import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageCircle, 
  Share2, 
  Calendar,
  ExternalLink,
  Play,
  BarChart3
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CommentSection } from "./CommentSection";

interface Post {
  id: string;
  title: string;
  content: string;
  media_type: string | null;
  media_url: string | null;
  media_thumbnail: string | null;
  poll_question: string | null;
  poll_options: string[] | null;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  is_pinned: boolean;
  created_at: string;
  user_id: string;
  profiles: {
    display_name: string | null;
  } | null;
}

interface PostCardProps {
  post: Post;
  onUpdate?: () => void;
}

export const PostCard = ({ post, onUpdate }: PostCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userReaction, setUserReaction] = useState<"like" | "dislike" | null>(null);
  const [pollVote, setPollVote] = useState<number | null>(null);
  const [pollResults, setPollResults] = useState<number[]>([]);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserReaction();
      if (post.poll_question) {
        fetchPollData();
      }
    }
  }, [user, post.id]);

  const fetchUserReaction = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("reactions")
      .select("reaction_type")
      .eq("post_id", post.id)
      .eq("user_id", user.id)
      .maybeSingle();

    setUserReaction((data?.reaction_type as "like" | "dislike") || null);
  };

  const fetchPollData = async () => {
    if (!user || !post.poll_options) return;

    // Get user's vote
    const { data: userVote } = await supabase
      .from("poll_votes")
      .select("option_index")
      .eq("post_id", post.id)
      .eq("user_id", user.id)
      .maybeSingle();

    setPollVote(userVote?.option_index ?? null);

    // Get poll results
    const { data: votes } = await supabase
      .from("poll_votes")
      .select("option_index")
      .eq("post_id", post.id);

    if (votes) {
      const results = new Array(post.poll_options.length).fill(0);
      votes.forEach(vote => {
        if (vote.option_index < results.length) {
          results[vote.option_index]++;
        }
      });
      setPollResults(results);
    }
  };

  const handleReaction = async (type: "like" | "dislike") => {
    if (!user) return;

    try {
      // Remove existing reaction if same type
      if (userReaction === type) {
        await supabase
          .from("reactions")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id)
          .eq("reaction_type", type);
        
        setUserReaction(null);
      } else {
        // Delete existing reaction and insert new one
        await supabase
          .from("reactions")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id);

        await supabase
          .from("reactions")
          .insert({
            post_id: post.id,
            user_id: user.id,
            reaction_type: type
          });

        setUserReaction(type);
      }

      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update reaction",
        variant: "destructive",
      });
    }
  };

  const handlePollVote = async (optionIndex: number) => {
    if (!user || pollVote !== null) return;

    try {
      await supabase
        .from("poll_votes")
        .insert({
          post_id: post.id,
          user_id: user.id,
          option_index: optionIndex
        });

      setPollVote(optionIndex);
      fetchPollData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to submit vote",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.content || "",
          url: url,
        });
      } catch (error) {
        // User cancelled sharing or sharing failed
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link Copied!",
        description: "Post link copied to clipboard",
      });
    }
  };

  const renderMedia = () => {
    if (!post.media_url || !post.media_type) return null;

    switch (post.media_type) {
      case "image":
        return (
          <img 
            src={post.media_url} 
            alt="Post media" 
            className="w-full max-h-96 object-cover rounded-lg"
          />
        );
      
      case "video":
        return (
          <video 
            src={post.media_url} 
            controls 
            className="w-full max-h-96 rounded-lg"
          />
        );
      
      case "youtube":
        const videoId = post.media_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
        return videoId ? (
          <div className="relative">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube video"
              className="w-full aspect-video rounded-lg"
              allowFullScreen
            />
          </div>
        ) : null;
      
      case "link":
        return (
          <a
            href={post.media_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 border rounded-lg hover:bg-accent transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="text-sm font-medium truncate">{post.media_url}</span>
          </a>
        );
      
      default:
        return null;
    }
  };

  const renderPoll = () => {
    if (!post.poll_question || !post.poll_options) return null;

    const totalVotes = pollResults.reduce((sum, count) => sum + count, 0);

    return (
      <div className="space-y-3 p-4 bg-accent/30 rounded-lg">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          <h4 className="font-medium">{post.poll_question}</h4>
        </div>
        
        <div className="space-y-2">
          {post.poll_options.map((option, index) => {
            const votes = pollResults[index] || 0;
            const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
            const isSelected = pollVote === index;
            const hasVoted = pollVote !== null;

            return (
              <div
                key={index}
                className={`relative p-3 rounded border cursor-pointer transition-colors ${
                  hasVoted 
                    ? isSelected 
                      ? "bg-primary/20 border-primary" 
                      : "bg-muted"
                    : "hover:bg-accent"
                }`}
                onClick={() => !hasVoted && handlePollVote(index)}
              >
                {hasVoted && (
                  <div 
                    className="absolute inset-0 bg-primary/10 rounded transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                )}
                <div className="relative flex justify-between items-center">
                  <span className="font-medium">{option}</span>
                  {hasVoted && (
                    <span className="text-sm text-muted-foreground">
                      {votes} votes ({percentage.toFixed(1)}%)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {totalVotes > 0 && (
          <p className="text-sm text-muted-foreground">
            {totalVotes} total vote{totalVotes !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>
                {post.profiles?.display_name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">
                {post.profiles?.display_name || "Anonymous"}
              </p>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </div>
            </div>
          </div>
          {post.is_pinned && (
            <div className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">
              Pinned
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
          {post.content && (
            <p className="text-muted-foreground whitespace-pre-wrap">{post.content}</p>
          )}
        </div>

        {renderMedia()}
        {renderPoll()}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReaction("like")}
              className={userReaction === "like" ? "text-primary" : ""}
            >
              <ThumbsUp className="h-4 w-4 mr-1" />
              {post.like_count}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReaction("dislike")}
              className={userReaction === "dislike" ? "text-destructive" : ""}
            >
              <ThumbsDown className="h-4 w-4 mr-1" />
              {post.dislike_count}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              {post.comment_count}
            </Button>
          </div>

          <Button variant="ghost" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        {showComments && (
          <CommentSection 
            postId={post.id} 
            onCommentAdded={onUpdate}
          />
        )}
      </CardContent>
    </Card>
  );
};