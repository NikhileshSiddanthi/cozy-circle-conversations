import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CleanupRequest {
  action: 'cleanup_my_posts' | 'cleanup_all_posts' | 'cleanup_user_posts';
  userId?: string; // For cleanup_user_posts action
}

interface CleanupResponse {
  success: boolean;
  deleted_posts: number;
  deleted_comments: number;
  deleted_reactions: number;
  deleted_post_media: number;
  deleted_drafts: number;
  message: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    // Get user from JWT
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.log('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'INVALID_TOKEN' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required', code: 'INSUFFICIENT_PERMISSIONS' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { action, userId }: CleanupRequest = await req.json();

    let targetUserId: string;
    let actionDescription: string;

    switch (action) {
      case 'cleanup_my_posts':
        targetUserId = user.id;
        actionDescription = 'your posts';
        break;
      
      case 'cleanup_user_posts':
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'User ID is required for cleanup_user_posts action' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        targetUserId = userId;
        actionDescription = `posts by user ${userId}`;
        break;
      
      case 'cleanup_all_posts':
        // Get all user IDs to clean up everything
        const { data: allUsers, error: usersError } = await supabaseClient
          .from('posts')
          .select('user_id')
          .neq('user_id', null);

        if (usersError) {
          throw usersError;
        }

        let totalDeleted = {
          deleted_posts: 0,
          deleted_comments: 0,
          deleted_reactions: 0,
          deleted_post_media: 0,
          deleted_drafts: 0
        };

        // Clean up posts for each user
        const uniqueUserIds = [...new Set(allUsers.map(p => p.user_id))];
        
        for (const userId of uniqueUserIds) {
          const { data: cleanupResult, error: cleanupError } = await supabaseClient
            .rpc('cleanup_posts_by_user', { _user_id: userId });

          if (cleanupError) {
            console.error('Cleanup error for user', userId, cleanupError);
            continue;
          }

          if (cleanupResult?.[0]) {
            totalDeleted.deleted_posts += cleanupResult[0].deleted_posts || 0;
            totalDeleted.deleted_comments += cleanupResult[0].deleted_comments || 0;
            totalDeleted.deleted_reactions += cleanupResult[0].deleted_reactions || 0;
            totalDeleted.deleted_post_media += cleanupResult[0].deleted_post_media || 0;
            totalDeleted.deleted_drafts += cleanupResult[0].deleted_drafts || 0;
          }
        }

        console.log('Cleanup completed - All posts deleted:', totalDeleted);

        const response: CleanupResponse = {
          success: true,
          ...totalDeleted,
          message: `Successfully cleaned up all posts. Deleted: ${totalDeleted.deleted_posts} posts, ${totalDeleted.deleted_comments} comments, ${totalDeleted.deleted_reactions} reactions, ${totalDeleted.deleted_post_media} media files, ${totalDeleted.deleted_drafts} drafts.`
        };

        return new Response(
          JSON.stringify(response),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use cleanup_my_posts, cleanup_user_posts, or cleanup_all_posts' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

    // Execute cleanup for single user
    console.log(`Starting cleanup: ${actionDescription} (${targetUserId})`);
    
    const { data: cleanupResult, error: cleanupError } = await supabaseClient
      .rpc('cleanup_posts_by_user', { _user_id: targetUserId });

    if (cleanupError) {
      console.error('Cleanup error:', cleanupError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to cleanup posts', 
          code: 'CLEANUP_FAILED',
          details: cleanupError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const result = cleanupResult?.[0] || {
      deleted_posts: 0,
      deleted_comments: 0,
      deleted_reactions: 0,
      deleted_post_media: 0,
      deleted_drafts: 0
    };

    console.log('Cleanup completed:', result);

    const response: CleanupResponse = {
      success: true,
      ...result,
      message: `Successfully cleaned up ${actionDescription}. Deleted: ${result.deleted_posts} posts, ${result.deleted_comments} comments, ${result.deleted_reactions} reactions, ${result.deleted_post_media} media files, ${result.deleted_drafts} drafts.`
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Cleanup function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});