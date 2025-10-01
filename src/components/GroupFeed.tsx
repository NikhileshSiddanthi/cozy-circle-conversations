import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Users, MessageCircle, TrendingUp, Share2 } from "lucide-react";
import { PostCard } from "./PostCard";
import { PostComposer } from "./PostComposer";
import { EmptyGroupState } from "./EmptyGroupState";


interface Group {
  id: string;
  name: string;
  description: string;
  member_count: number;
  type: string;
  is_public: boolean;
}

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
  metadata?: {
    link_preview?: any;
  };
}

interface GroupFeedProps {
  groupId: string;
}

export const GroupFeed = ({ groupId }: GroupFeedProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  

  useEffect(() => {
    fetchGroupData();
    fetchPosts();
    checkMembership();
  }, [groupId, user]);

  const fetchGroupData = async () => {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .eq("is_approved", true)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load group",
        variant: "destructive",
      });
    } else {
      setGroup(data);
    }
  };

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive",
      });
    } else if (data) {
      // Get user profiles for posts
      const userIds = [...new Set(data.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      const postsWithProfiles = data.map(post => {
        const profile = profileMap.get(post.user_id) || null;
        // Create a fallback display name if profile exists but display_name is null
        let displayName = profile?.display_name;
        if (!displayName && profile) {
          displayName = `User ${post.user_id.slice(-4)}`; // Use last 4 chars of user ID as fallback
        }
        
        return {
          ...post,
          poll_options: Array.isArray(post.poll_options) ? post.poll_options : [],
          profiles: profile ? { ...profile, display_name: displayName } : null
        };
      }) as Post[];

      setPosts(postsWithProfiles);
    }
    setIsLoading(false);
  };

  const checkMembership = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("group_members")
      .select("status")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .maybeSingle();

    setIsMember(data?.status === "approved");
  };

  const handleJoinGroup = async () => {
    if (!user || !group) return;

    try {
      const { error } = await supabase
        .from("group_members")
        .insert({
          group_id: groupId,
          user_id: user.id,
          role: "member",
          status: "approved"
        });

      if (error) throw error;

      setIsMember(true);
      
      // Update member count
      setGroup(prev => prev ? { ...prev, member_count: prev.member_count + 1 } : null);

      toast({
        title: "Joined Successfully!",
        description: "You are now a member of this group.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to join group",
        variant: "destructive",
      });
    }
  };

  const handleShareGroup = async () => {
    if (!group) return;

    const url = `${window.location.origin}/group/${groupId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: group.name,
          text: group.description || "",
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
        description: "Group link copied to clipboard",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Loading group...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Group not found or not approved yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Group Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{group.name}</CardTitle>
              {group.description && (
                <p className="text-muted-foreground mt-2">{group.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  {group.type.replace("-", " ")}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleShareGroup}>
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
              {!isMember ? (
                <Button onClick={handleJoinGroup}>
                  <Users className="h-4 w-4 mr-1" />
                  Join Group
                </Button>
              ) : (
                <div className="bg-primary/10 text-primary px-3 py-1 rounded text-sm font-medium">
                  Member
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Post Composer - Now available to all authenticated users */}
      {user && (
        <PostComposer
          groups={[{ id: group.id, name: group.name, is_public: group.is_public }]}
          selectedGroupId={groupId}
          onSuccess={fetchPosts}
        />
      )}

      {/* Posts Feed */}
      <div className="space-y-6">
        {posts.length === 0 ? (
          <EmptyGroupState 
            isMember={true} // Show "create post" option for all authenticated users
            onCreatePost={() => {
              // Scroll to the PostComposer above
              const composer = document.querySelector('[data-testid="create-post-button"]');
              composer?.scrollIntoView({ behavior: 'smooth' });
              (composer as HTMLElement)?.click();
            }}
          />
        ) : (
          posts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              onUpdate={fetchPosts}
            />
          ))
        )}
      </div>
    </div>
  );
};