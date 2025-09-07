import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PublishPostData {
  draftId: string
  groupId: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.log('Authentication error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const body: PublishPostData = await req.json()

    if (!body.draftId || !body.groupId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: draftId, groupId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Publishing post:', { 
      draftId: body.draftId, 
      groupId: body.groupId, 
      userId: user.id 
    })

    // Start atomic transaction simulation using multiple operations
    try {
      // 1. Verify user membership and permissions
      console.log('Checking membership for:', { groupId: body.groupId, userId: user.id })
      
      const { data: membership, error: membershipError } = await supabaseClient
        .from('group_members')
        .select('status, role')
        .eq('group_id', body.groupId)
        .eq('user_id', user.id)
        .single()

      console.log('Membership check result:', { membership, membershipError })

      if (membershipError || !membership || membership.status !== 'approved') {
        console.error('Membership check failed:', { membershipError, membership })
        throw new Error('User not authorized to post in this group')
      }

      // 2. Get draft with media
      console.log('Fetching draft:', { draftId: body.draftId, userId: user.id })
      
      const { data: draft, error: draftError } = await supabaseClient
        .from('post_drafts')
        .select(`
          *,
          draft_media (
            id,
            file_id,
            url,
            mime_type,
            file_size,
            status
          )
        `)
        .eq('id', body.draftId)
        .eq('user_id', user.id)
        .eq('status', 'editing')
        .single()

      console.log('Draft fetch result:', { 
        draft: draft ? { ...draft, draft_media: draft.draft_media?.length } : null, 
        draftError 
      })

      if (draftError || !draft) {
        console.error('Draft fetch failed:', { draftError, draft })
        throw new Error('Draft not found or already published')
      }

      // Validate draft has minimum content
      console.log('Draft validation:', {
        hasTitle: !!draft.title?.trim(),
        hasContent: !!draft.content?.trim(),
        mediaCount: draft.draft_media?.length || 0,
        mediaStatuses: draft.draft_media?.map(m => m.status) || []
      })
      
      const hasUploadedMedia = draft.draft_media?.some(m => m.status === 'uploaded') || false
      
      if (!draft.title?.trim() && !draft.content?.trim() && !hasUploadedMedia) {
        throw new Error('Draft must have title, content, or media')
      }

      // 3. Create post record
      const mediaUrls = draft.draft_media?.filter(m => m.status === 'uploaded').map(m => m.url) || []
      
      // Determine media type based on uploaded files
      let mediaType = null;
      let mediaUrl = null;
      
      if (mediaUrls.length > 0) {
        if (mediaUrls.length === 1) {
          // Single media file - detect type
          const url = mediaUrls[0];
          if (url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) {
            mediaType = 'image';
            mediaUrl = url;
          } else if (url.match(/\.(mp4|webm|mov)(\?|$)/i)) {
            mediaType = 'video';
            mediaUrl = url;
          } else {
            mediaType = 'file';
            mediaUrl = url;
          }
        } else {
          // Multiple media files
          mediaType = 'multiple';
          mediaUrl = JSON.stringify(mediaUrls);
        }
      }
      
      const postData = {
        title: draft.title || 'Untitled',
        content: draft.content,
        group_id: body.groupId,
        user_id: user.id,
        media_type: mediaType,
        media_url: mediaUrl,
        // Handle poll data if exists in metadata
        poll_question: draft.metadata?.poll?.question || null,
        poll_options: draft.metadata?.poll?.options || null,
      }

      console.log('Creating post with data:', postData)
      
      const { data: post, error: postError } = await supabaseClient
        .from('posts')
        .insert(postData)
        .select('*')
        .single()

      console.log('Post creation result:', { 
        post: post ? { id: post.id, title: post.title } : null, 
        postError 
      })

      if (postError) {
        console.error('Post creation failed:', postError)
        throw new Error(`Failed to create post: ${postError.message}`)
      }

      // 4. Create post_media records and mark draft media as attached
      if (draft.draft_media && draft.draft_media.length > 0) {
        // Insert into post_media table
        const postMediaData = draft.draft_media
          .filter(m => m.status === 'uploaded')
          .map(m => ({
            post_id: post.id,
            file_id: m.file_id,
            url: m.url,
            mime_type: m.mime_type,
            file_size: m.file_size,
            status: 'attached'
          }))

        const { error: postMediaError } = await supabaseClient
          .from('post_media')
          .insert(postMediaData)

        if (postMediaError) {
          // Rollback: delete the created post
          await supabaseClient
            .from('posts')
            .delete()
            .eq('id', post.id)

          throw new Error(`Failed to create post media: ${postMediaError.message}`)
        }

        // Mark draft media as attached
        const { error: mediaUpdateError } = await supabaseClient
          .from('draft_media')
          .update({ 
            status: 'attached',
            updated_at: new Date().toISOString()
          })
          .eq('draft_id', body.draftId)
          .eq('status', 'uploaded')

        if (mediaUpdateError) {
          // Rollback: delete the created post and post_media
          await supabaseClient
            .from('posts')
            .delete()
            .eq('id', post.id)
          
          await supabaseClient
            .from('post_media')
            .delete()
            .eq('post_id', post.id)

          throw new Error(`Failed to attach media: ${mediaUpdateError.message}`)
        }
      }

      // 5. Mark draft as published (or delete it)
      const { error: draftUpdateError } = await supabaseClient
        .from('post_drafts')
        .update({ 
          status: 'published',
          updated_at: new Date().toISOString()
        })
        .eq('id', body.draftId)

      if (draftUpdateError) {
        // Rollback: delete post and reset media status
        await supabaseClient.from('posts').delete().eq('id', post.id)
        
        if (draft.draft_media && draft.draft_media.length > 0) {
          await supabaseClient
            .from('draft_media')
            .update({ status: 'uploaded' })
            .eq('draft_id', body.draftId)
        }

        throw new Error(`Failed to update draft status: ${draftUpdateError.message}`)
      }

      console.log('Post published successfully:', { 
        postId: post.id, 
        draftId: body.draftId,
        mediaCount: draft.draft_media?.length || 0 
      })

      return new Response(
        JSON.stringify({ 
          success: true, 
          post,
          mediaAttached: draft.draft_media?.length || 0
        }),
        { 
          status: 201, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (error) {
      console.error('Publish failed - transaction rolled back:', error)
      
      return new Response(
        JSON.stringify({ 
          error: error instanceof Error ? error.message : 'Failed to publish post',
          rollback: true
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})