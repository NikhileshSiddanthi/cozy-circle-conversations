import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Trash2, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  User,
  Users,
  FileX
} from 'lucide-react';

interface CleanupStats {
  deleted_posts: number;
  deleted_comments: number;
  deleted_reactions: number;
  deleted_post_media: number;
  deleted_drafts: number;
}

export const DataCleanupTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [lastCleanup, setLastCleanup] = useState<CleanupStats | null>(null);

  const handleCleanup = async (action: 'cleanup_my_posts' | 'cleanup_all_posts') => {
    if (!user) return;

    const actionLabels = {
      cleanup_my_posts: 'Cleaning up your posts',
      cleanup_all_posts: 'Cleaning up ALL posts'
    };

    const confirmMessages = {
      cleanup_my_posts: 'Are you sure you want to delete all your posts, comments, and related data? This action cannot be undone.',
      cleanup_all_posts: 'Are you sure you want to delete ALL posts from ALL users? This will completely reset the platform data and cannot be undone.'
    };

    if (!confirm(confirmMessages[action])) {
      return;
    }

    setLoading(action);
    setLastCleanup(null);

    try {
      const { data, error } = await supabase.functions.invoke('cleanup-test-data', {
        body: { action }
      });

      if (error) {
        throw error;
      }

      setLastCleanup({
        deleted_posts: data.deleted_posts,
        deleted_comments: data.deleted_comments,
        deleted_reactions: data.deleted_reactions,
        deleted_post_media: data.deleted_post_media,
        deleted_drafts: data.deleted_drafts
      });

      toast({
        title: "Cleanup Completed",
        description: data.message,
        duration: 5000,
      });

    } catch (error) {
      console.error('Cleanup failed:', error);
      toast({
        title: "Cleanup Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Database className="h-6 w-6" />
        <div>
          <h2 className="text-2xl font-semibold">Data Cleanup</h2>
          <p className="text-muted-foreground">Remove test data before sharing with stakeholders</p>
        </div>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Warning:</strong> These cleanup operations are permanent and cannot be undone. 
          Make sure you've backed up any important data before proceeding.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Cleanup My Posts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Clean My Posts
            </CardTitle>
            <CardDescription>
              Remove all posts, comments, and media created by your account only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              This will delete:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All your posts</li>
                <li>Comments on your posts</li>
                <li>All reactions on your posts</li>
                <li>Media files associated with your posts</li>
                <li>Your draft posts</li>
              </ul>
            </div>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => handleCleanup('cleanup_my_posts')}
              disabled={loading !== null}
            >
              {loading === 'cleanup_my_posts' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cleaning Up...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clean My Posts
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Cleanup All Posts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Clean All Posts
            </CardTitle>
            <CardDescription>
              Remove ALL posts from ALL users. Complete platform reset.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              This will delete:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All posts from all users</li>
                <li>All comments</li>
                <li>All reactions</li>
                <li>All media files</li>
                <li>All draft posts</li>
              </ul>
            </div>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => handleCleanup('cleanup_all_posts')}
              disabled={loading !== null}
            >
              {loading === 'cleanup_all_posts' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cleaning Up...
                </>
              ) : (
                <>
                  <FileX className="h-4 w-4 mr-2" />
                  Clean All Posts
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Cleanup Results */}
      {lastCleanup && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Last Cleanup Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {lastCleanup.deleted_posts}
                </Badge>
                <p className="text-sm text-muted-foreground mt-1">Posts</p>
              </div>
              <div className="text-center">
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {lastCleanup.deleted_comments}
                </Badge>
                <p className="text-sm text-muted-foreground mt-1">Comments</p>
              </div>
              <div className="text-center">
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {lastCleanup.deleted_reactions}
                </Badge>
                <p className="text-sm text-muted-foreground mt-1">Reactions</p>
              </div>
              <div className="text-center">
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {lastCleanup.deleted_post_media}
                </Badge>
                <p className="text-sm text-muted-foreground mt-1">Media</p>
              </div>
              <div className="text-center">
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {lastCleanup.deleted_drafts}
                </Badge>
                <p className="text-sm text-muted-foreground mt-1">Drafts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};