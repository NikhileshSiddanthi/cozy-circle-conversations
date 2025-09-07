import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EditCommentData {
  commentId: string
  content: string
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

    if (req.method !== 'PATCH') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const body: EditCommentData = await req.json()

    if (!body.commentId || !body.content?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: commentId, content' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Editing comment:', { 
      commentId: body.commentId, 
      userId: user.id,
      contentLength: body.content.length
    })

    try {
      // 1. Verify user can edit this comment
      const { data: comment, error: fetchError } = await supabaseClient
        .from('comments')
        .select(`
          *,
          posts!inner (
            id,
            group_id,
            groups!inner (
              id,
              name
            )
          )
        `)
        .eq('id', body.commentId)
        .single()

      if (fetchError || !comment) {
        console.error('Comment fetch failed:', fetchError)
        return new Response(
          JSON.stringify({ error: 'Comment not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Check if user is author
      const isAuthor = comment.user_id === user.id

      // Check if user is moderator/admin in the group
      const { data: membership } = await supabaseClient
        .from('group_members')
        .select('role, status')
        .eq('group_id', comment.posts.group_id)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .single()

      const isModerator = membership && ['admin', 'moderator'].includes(membership.role)

      // Check global admin role
      const { data: userRole } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      const isGlobalAdmin = userRole?.role === 'admin'

      if (!isAuthor && !isModerator && !isGlobalAdmin) {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions to edit this comment' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // 2. Update the comment
      const { data: updatedComment, error: updateError } = await supabaseClient
        .from('comments')
        .update({
          content: body.content.trim(),
          is_edited: true,
          edited_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', body.commentId)
        .select(`
          *,
          profiles:user_id (display_name, avatar_url)
        `)
        .single()

      if (updateError) {
        console.error('Comment update failed:', updateError)
        throw new Error(`Failed to update comment: ${updateError.message}`)
      }

      console.log('Comment updated successfully:', { 
        commentId: updatedComment.id,
        isEdited: updatedComment.is_edited
      })

      return new Response(
        JSON.stringify({ 
          success: true, 
          comment: updatedComment
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
          error: error instanceof Error ? error.message : 'Failed to edit comment'
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