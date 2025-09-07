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
}

interface PublishPostResponse {
  postId: string;
  attachedMediaCount: number;
  postUrl: string;
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

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { draftId, visibility = 'public', publishOptions = {} }: PublishPostRequest = await req.json();

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

    // Validate draft has content (title OR content OR media)
    const hasTitle = draft.title && draft.title.trim().length > 0;
    const hasContent = draft.content && draft.content.trim().length > 0;
    const hasMedia = draftMedia && draftMedia.length > 0;
    
    console.log('PUB VALIDATE:', { hasTitle, hasContent, hasMedia, title: draft.title, content: draft.content?.length });
    
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

    // Begin atomic transaction to create post and attach media
    const { data: postData, error: postError } = await supabaseClient
      .from('posts')
      .insert({
        user_id: user.id,
        group_id: draft.group_id,
        title: draft.title || 'Untitled Post',
        content: draft.content || '',
        media_type: draftMedia && draftMedia.length > 0 ? (draftMedia.length > 1 ? 'multiple' : 'image') : null,
        media_url: draftMedia && draftMedia.length > 0 ? draftMedia[0].url : null,
        media_thumbnail: draftMedia && draftMedia.length > 0 ? draftMedia[0].thumbnail_url : null,
        metadata: { 
          draft_id: draftId,
          visibility,
          publish_options: publishOptions
        }
      })
      .select()
      .single();

    if (postError) {
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