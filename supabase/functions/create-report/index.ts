import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateReportRequest {
  post_id: string;
  reason: 'spam' | 'harassment' | 'hate_speech' | 'violence' | 'misinformation' | 'inappropriate_content' | 'other';
  details?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { post_id, reason, details }: CreateReportRequest = await req.json();

    // Validate input
    if (!post_id || !reason) {
      return new Response(
        JSON.stringify({ error: 'post_id and reason are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validReasons = ['spam', 'harassment', 'hate_speech', 'violence', 'misinformation', 'inappropriate_content', 'other'];
    if (!validReasons.includes(reason)) {
      return new Response(
        JSON.stringify({ error: 'Invalid reason' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify post exists
    const { data: post, error: postError } = await supabaseClient
      .from('posts')
      .select('id, user_id')
      .eq('id', post_id)
      .single();

    if (postError || !post) {
      return new Response(
        JSON.stringify({ error: 'Post not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-reporting
    if (post.user_id === user.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot report your own post' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create report (will fail if duplicate due to unique constraint)
    const { data: report, error: reportError } = await supabaseClient
      .from('reports')
      .insert({
        reporter_id: user.id,
        post_id,
        reason,
        details: details?.trim() || null,
        status: 'pending'
      })
      .select()
      .single();

    if (reportError) {
      if (reportError.code === '23505') { // Unique constraint violation
        return new Response(
          JSON.stringify({ error: 'You have already reported this post' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.error('Failed to create report:', reportError);
      return new Response(
        JSON.stringify({ error: 'Failed to create report' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if post should be auto-flagged (e.g., multiple reports)
    const { count } = await supabaseClient
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', post_id)
      .eq('status', 'pending');

    // Auto-flag if 3 or more reports
    if (count && count >= 3) {
      await supabaseClient
        .from('posts')
        .update({ 
          is_flagged: true, 
          flagged_at: new Date().toISOString() 
        })
        .eq('id', post_id);
    }

    console.log(`Report created: ${report.id} for post ${post_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        report_id: report.id 
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
