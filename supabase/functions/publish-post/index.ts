import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PublishPostRequest {
  draftId: string;
  visibility?: 'public' | 'private' | 'group';
  publishOptions?: {
    notifyMembers?: boolean;
  };
  linkPreview?: {
    url: string;
    title?: string;
    description?: string;
  } | null;
}

interface PublishPostResponse {
  postId: string;
  attachedMediaCount: number;
  postUrl: string;
}

// Simple HTML sanitization - removes script tags and dangerous attributes
const sanitizeHTML = (dirty: string): string => {
  if (!dirty) return '';
  
  // Remove script tags and their content
  let clean = dirty.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove on* event handlers
  clean = clean.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
  clean = clean.replace(/\son\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove javascript: protocols
  clean = clean.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '');
  
  // Remove data attributes except whitelisted ones
  clean = clean.replace(/\sdata-(?!lov-id)[a-z-]+\s*=\s*["'][^"']*["']/gi, '');
  
  return clean;
};

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
    // Get user from JWT - with better error handling
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization required', code: 'NO_AUTH_HEADER' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Try to get user with better error handling
    let user;
    try {
      const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
      
      if (authError) {
        console.log('Auth error details:', {
          message: authError.message,
          status: authError.status,
          code: authError.code || 'UNKNOWN_AUTH_ERROR'
        });
        
        // Handle different auth error types
        if (authError.code === 'session_not_found' || authError.message?.includes('session')) {
          return new Response(
            JSON.stringify({ 
              error: 'Session expired. Please sign in again.', 
              code: 'SESSION_EXPIRED',
              details: 'Your session has expired. Please refresh the page and sign in again.' 
            }),
            { 
              status: 401, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        return new Response(
          JSON.stringify({ 
            error: 'Authentication failed', 
            code: authError.code || 'AUTH_FAILED',
            details: authError.message 
          }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      user = userData.user;
      
    } catch (authException) {
      console.log('Auth exception:', authException);
      return new Response(
        JSON.stringify({ 
          error: 'Authentication system error', 
          code: 'AUTH_SYSTEM_ERROR',
          details: authException instanceof Error ? authException.message : 'Unknown authentication error'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!user) {
      console.log('No user found in JWT');
      return new Response(
        JSON.stringify({ error: 'User not found', code: 'USER_NOT_FOUND' }),
        { 
          status: 401, 
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

    const { draftId, visibility = 'public', publishOptions = {}, linkPreview }: PublishPostRequest = await req.json();

    if (!draftId) {
      return new Response(
        JSON.stringify({ error: 'Draft ID is required', code: 'MISSING_DRAFT_ID' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`PUB START: draftId=${draftId}, userId=${user.id}`);

    // Check for idempotency - see if post already exists for this draft
    const { data: existingPost } = await supabaseClient
      .from('posts')
      .select('id, title')
      .eq('metadata->>draft_id', draftId)
      .single();

    if (existingPost) {
      console.log(`Draft ${draftId} already published as post ${existingPost.id}`);
      return new Response(
        JSON.stringify({
          postId: existingPost.id,
          attachedMediaCount: 0,
          postUrl: `/posts/${existingPost.id}`,
          message: 'Post already published'
        } as PublishPostResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate draft ownership and get draft data
    const { data: draft, error: draftError } = await supabaseClient
      .from('post_drafts')
      .select('*')
      .eq('id', draftId)
      .eq('user_id', user.id)
      .single();
      
    if (draftError || !draft) {
      console.log('Draft not found or access denied:', draftError);
      return new Response(
        JSON.stringify({ 
          error: draftError?.code === 'PGRST116' ? 'Draft not found' : 'Access denied', 
          code: draftError?.code === 'PGRST116' ? 'DRAFT_NOT_FOUND' : 'ACCESS_DENIED' 
        }),
        { 
          status: draftError?.code === 'PGRST116' ? 404 : 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get draft media ordered by order_index
    const { data: draftMedia } = await supabaseClient
      .from('draft_media')
      .select('*')
      .eq('draft_id', draftId)
      .order('order_index', { ascending: true });

    console.log(`Found ${draftMedia?.length || 0} media files to attach`);

    // Sanitize content server-side to prevent XSS
    let sanitizedContent = '';
    if (draft.content) {
      sanitizedContent = sanitizeHTML(draft.content);
      console.log('Content sanitized:', {
        original_length: draft.content.length,
        sanitized_length: sanitizedContent.length
      });
    }

    // Validate draft has content (title OR content OR media)
    const hasTitle = draft.title && draft.title.trim().length > 0;
    const hasContent = sanitizedContent.trim().length > 0;
    const hasMedia = draftMedia && draftMedia.length > 0;
    
    console.log('PUB VALIDATE:', { hasTitle, hasContent, hasMedia, title: draft.title, content_length: sanitizedContent.length });
    
    if (!hasTitle && !hasContent && !hasMedia) {
      return new Response(
        JSON.stringify({ 
          error: 'Draft must have title, content, or media to publish', 
          code: 'INSUFFICIENT_CONTENT',
          message: 'Draft must have title, content, or media'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Enforce content length limit (5000 chars)
    if (sanitizedContent.length > 5000) {
      return new Response(
        JSON.stringify({ 
          error: 'Content exceeds maximum length of 5000 characters', 
          code: 'CONTENT_TOO_LONG'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Prepare media data for post
    let mediaType = null;
    let mediaUrl = null;
    let mediaThumbnail = null;
    
    if (linkPreview) {
      // Store link preview in metadata, not as media
      // This allows posts to have both link previews AND media files
    } else if (draftMedia && draftMedia.length > 0) {
      mediaType = 'image'; // Use 'image' for both single and multiple images
      if (draftMedia.length === 1) {
        mediaUrl = draftMedia[0].url;
        mediaThumbnail = draftMedia[0].thumbnail_url;
      } else {
        // Store multiple image URLs as JSON array
        mediaUrl = JSON.stringify(draftMedia.map(media => media.url));
        mediaThumbnail = draftMedia[0].thumbnail_url; // Use first image as thumbnail
      }
    }

    // Prepare post data for insertion
    const postDataToInsert = {
      user_id: user.id, // Server-side enforcement, cannot be spoofed
      group_id: draft.group_id,
      title: draft.title && draft.title.trim() ? draft.title.trim().substring(0, 100) : null, // Enforce 100 char limit
      content: sanitizedContent || '', // Use sanitized content
      media_type: mediaType,
      media_url: mediaUrl,
      media_thumbnail: mediaThumbnail,
      metadata: { 
        draft_id: draftId,
        visibility,
        publish_options: publishOptions,
        link_preview: linkPreview || undefined
      }
    };

    console.log('INSERT DATA (sanitized):', JSON.stringify(postDataToInsert, null, 2));

    // Begin atomic transaction to create post and attach media
    const { data: postData, error: postError } = await supabaseClient
      .from('posts')
      .insert(postDataToInsert)
      .select()
      .single();

    if (postError) {
      console.log('POST INSERT ERROR DETAILS:');
      console.log('Error code:', postError.code);
      console.log('Error message:', postError.message);
      console.log('Error details:', JSON.stringify(postError, null, 2));
      console.log('Failed to create post:', postError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create post', 
          code: 'PUBLISH_DB_ERROR',
          details: postError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`POST CREATED: id=${postData.id}, title="${postData.title}"`);

    let attachedMediaCount = 0;

    // Attach media files if they exist
    if (draftMedia && draftMedia.length > 0) {
      const mediaInserts = draftMedia.map((media, index) => ({
        post_id: postData.id,
        user_id: user.id,
        file_id: media.file_id,
        url: media.url,
        thumbnail_url: media.thumbnail_url,
        mime_type: media.mime_type,
        file_size: media.file_size,
        order_index: index,
        status: 'attached'
      }));

      const { error: mediaError } = await supabaseClient
        .from('post_media')
        .insert(mediaInserts);

      if (mediaError) {
        console.log('Failed to attach media, rolling back post:', mediaError);
        
        // Rollback - delete the created post
        await supabaseClient
          .from('posts')
          .delete()
          .eq('id', postData.id);

        return new Response(
          JSON.stringify({ 
            error: 'Failed to attach media', 
            code: 'PUBLISH_DB_ERROR',
            details: mediaError.message 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log(`Attached ${draftMedia.length} media files`);
      attachedMediaCount = draftMedia.length;

      // Mark draft media as attached
      await supabaseClient
        .from('draft_media')
        .update({ status: 'attached' })
        .eq('draft_id', draftId);
    }

    // Mark draft as published
    const { error: draftUpdateError } = await supabaseClient
      .from('post_drafts')
      .update({ 
        status: 'published',
        updated_at: new Date().toISOString()
      })
      .eq('id', draftId);

    if (draftUpdateError) {
      console.log('Warning: Failed to update draft status:', draftUpdateError);
      // Don't fail the publish for this, post is already created
    }

    console.log(`Successfully published draft ${draftId} as post ${postData.id}`);

    // Create notifications for group members if this is a group post
    if (draft.group_id && publishOptions.notifyMembers !== false) {
      try {
        // Get all group members except the post creator
        const { data: groupMembers } = await supabaseClient
          .from('group_members')
          .select('user_id')
          .eq('group_id', draft.group_id)
          .eq('status', 'approved')
          .neq('user_id', user.id);

        if (groupMembers && groupMembers.length > 0) {
          // Get group name for notification
          const { data: groupData } = await supabaseClient
            .from('groups')
            .select('name')
            .eq('id', draft.group_id)
            .single();

          const notifications = groupMembers.map(member => ({
            user_id: member.user_id,
            type: 'group_post',
            title: 'New Post in Group',
            message: `New post in ${groupData?.name || 'your group'}: ${postData.title || 'Untitled'}`,
            data: { 
              post_id: postData.id,
              group_id: draft.group_id,
              author_id: user.id
            }
          }));

          await supabaseClient
            .from('notifications')
            .insert(notifications);
          
          console.log(`Created ${notifications.length} group post notifications`);
        }
      } catch (notifError) {
        console.error('Failed to create group notifications:', notifError);
        // Don't fail the publish for notification errors
      }
    }

    return new Response(
      JSON.stringify({
        postId: postData.id,
        attachedMediaCount,
        postUrl: `/posts/${postData.id}`
      } as PublishPostResponse),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error during publish:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
