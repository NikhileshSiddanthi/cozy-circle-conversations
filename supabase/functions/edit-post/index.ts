import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EditPostData {
  postId: string
  title?: string
  content?: string
  mediaFiles?: string[]
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

    const body: EditPostData = await req.json()

    if (!body.postId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: postId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Editing post:', { 
      postId: body.postId, 
      userId: user.id,
      hasTitle: !!body.title,
      hasContent: !!body.content,
      mediaCount: body.mediaFiles?.length || 0
    })

    try {
      // 1. Verify user can edit this post
      const { data: post, error: fetchError } = await supabaseClient
        .from('posts')
        .select(`
          *,
          groups!inner (
            id,
            name
          ),
          group_members!inner (
            user_id,
            role,
            status
          )
        `)
        .eq('id', body.postId)
        .or(`user_id.eq.${user.id},group_members.user_id.eq.${user.id}`)
        .eq('group_members.status', 'approved')
        .single()

      if (fetchError || !post) {
        console.error('Post fetch failed:', fetchError)
        return new Response(
          JSON.stringify({ error: 'Post not found or access denied' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Check if user is author or admin/moderator
      const isAuthor = post.user_id === user.id
      const isModerator = post.group_members?.some((gm: any) => 
        gm.user_id === user.id && ['admin', 'moderator'].includes(gm.role)
      )

      // Check global admin role
      const { data: userRole } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      const isGlobalAdmin = userRole?.role === 'admin'

      if (!isAuthor && !isModerator && !isGlobalAdmin) {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions to edit this post' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // 2. Handle media files
      let mediaType = null;
      let mediaUrl = null;
      
      if (body.mediaFiles !== undefined) {
        // First, delete existing media for this post
        const { error: deleteMediaError } = await supabaseClient
          .from('post_media')
          .delete()
          .eq('post_id', body.postId)

        if (deleteMediaError) {
          console.error('Failed to delete existing media:', deleteMediaError)
          throw new Error('Failed to update media files')
        }

        if (body.mediaFiles.length > 0) {
          if (body.mediaFiles.length === 1) {
            const url = body.mediaFiles[0];
            if (url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) {
              mediaType = 'image';
            } else if (url.match(/\.(mp4|webm|mov)(\?|$)/i)) {
              mediaType = 'video';
            } else {
              mediaType = 'file';
            }
            mediaUrl = url;
          } else {
            mediaType = 'multiple';
            mediaUrl = body.mediaFiles[0]; // Use first URL for legacy support
          }

          // Insert new media records
          const mediaInserts = body.mediaFiles.map((url, index) => ({
            post_id: body.postId,
            user_id: user.id,
            file_id: `media_${body.postId}_${index}_${Date.now()}`,
            url: url,
            mime_type: url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i) ? 'image/jpeg' : 
                      url.match(/\.(mp4|webm|mov)(\?|$)/i) ? 'video/mp4' : 'application/octet-stream',
            order_index: index,
            status: 'attached'
          }));

          const { error: mediaError } = await supabaseClient
            .from('post_media')
            .insert(mediaInserts)

          if (mediaError) {
            console.error('Failed to insert new media:', mediaError)
            throw new Error('Failed to update media files')
          }
        }
      }

      // 3. Update the post
      const updateData: any = {
        is_edited: true,
        edited_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      if (body.title !== undefined) updateData.title = body.title
      if (body.content !== undefined) updateData.content = body.content
      if (body.mediaFiles !== undefined) {
        updateData.media_type = mediaType
        updateData.media_url = mediaUrl
      }

      const { data: updatedPost, error: updateError } = await supabaseClient
        .from('posts')
        .update(updateData)
        .eq('id', body.postId)
        .select(`
          *,
          profiles:user_id (display_name, avatar_url),
          groups (name, is_public)
        `)
        .single()

      if (updateError) {
        console.error('Post update failed:', updateError)
        throw new Error(`Failed to update post: ${updateError.message}`)
      }

      console.log('Post updated successfully:', { 
        postId: updatedPost.id, 
        title: updatedPost.title,
        isEdited: updatedPost.is_edited
      })

      return new Response(
        JSON.stringify({ 
          success: true, 
          post: updatedPost
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (error) {
      console.error('Edit failed:', error)
      
      return new Response(
        JSON.stringify({ 
          error: error instanceof Error ? error.message : 'Failed to edit post'
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