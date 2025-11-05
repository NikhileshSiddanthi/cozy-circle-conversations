import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Starting seed data generation...');

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Helper function to call AI with retry logic
    async function generateWithAI(prompt: string, retries = 2): Promise<string> {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash-lite',
              messages: [
                { role: 'system', content: 'You are a helpful assistant. Give concise responses.' },
                { role: 'user', content: prompt }
              ],
              max_completion_tokens: 100,
            }),
          });

          if (!response.ok) {
            if (attempt < retries) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
            throw new Error(`AI API error: ${response.status}`);
          }

          const data = await response.json();
          return data.choices[0].message.content.trim();
        } catch (error) {
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          throw error;
        }
      }
      throw new Error('Failed after retries');
    }

    const postTemplates = [
      { title: 'Welcome to our community!', content: 'Excited to be part of this group. Looking forward to great discussions and sharing ideas with everyone here.' },
      { title: 'What are your thoughts on this?', content: 'I\'ve been thinking about this topic lately and would love to hear different perspectives from the community.' },
      { title: 'Sharing my experience', content: 'I wanted to share something interesting that happened recently. Hope this helps or inspires someone in the group.' },
      { title: 'Question for the community', content: 'I have a question that I hope some of you can help me with. Any insights would be greatly appreciated!' },
      { title: 'Great resource I found', content: 'Just discovered something amazing that I think everyone here would find valuable. Check it out and let me know what you think!' }
    ];

    const commentTemplates = [
      'Great post! Thanks for sharing this.',
      'I completely agree with your perspective.',
      'This is really helpful, appreciate it!',
      'Interesting take on this topic.',
      'Thanks for bringing this up!'
    ];
    // Only 2 categories for simplicity
    const categoryThemes = [
      { name: 'Technology', icon: 'Laptop', color: 'bg-blue-500', description: 'All things tech and innovation' },
      { name: 'Sports', icon: 'Trophy', color: 'bg-green-500', description: 'Sports news and discussions' }
    ];

    const categories = [];
    
    // Get or create categories
    for (const theme of categoryThemes) {
      let { data: existingCategory } = await supabaseClient
        .from('categories')
        .select('*')
        .eq('name', theme.name)
        .single();

      let category = existingCategory;

      if (!existingCategory) {
        const { data: newCategory, error } = await supabaseClient
          .from('categories')
          .insert({
            name: theme.name,
            description: theme.description,
            icon: theme.icon,
            color_class: theme.color
          })
          .select()
          .single();

        if (error) {
          console.error(`Error creating category ${theme.name}:`, error);
          continue;
        }
        category = newCategory;
        console.log(`Created category: ${theme.name}`);
      } else {
        console.log(`Using existing category: ${theme.name}`);
      }

      categories.push({ ...category, theme: theme.name });

      // Create 1 group per category
      const groupName = await generateWithAI(`Generate a group name for ${theme.name}. Just the name, max 50 chars.`);
      const groupDescription = `A community for ${theme.name.toLowerCase()} enthusiasts.`;

      const { data: group, error: groupError } = await supabaseClient
        .from('groups')
        .insert({
          name: groupName,
          description: groupDescription,
          category_id: category.id,
          creator_id: user.id,
          is_public: true,
          is_approved: true,
          type: 'topic'
        })
        .select()
        .single();

      if (groupError) {
        console.error(`Error creating group:`, groupError);
        continue;
      }

      console.log(`Created group: ${groupName}`);

      // Auto-join creator to the group
      await supabaseClient
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'admin',
          status: 'approved'
        });

      // Create 5 posts per group using AI
      for (let j = 0; j < 5; j++) {
        const postTitle = await generateWithAI(`Generate a post title about ${theme.name}. Max 80 chars.`);
        const postContent = await generateWithAI(`Write a brief post about: "${postTitle}". 2-3 sentences.`);

        const { data: post, error: postError } = await supabaseClient
          .from('posts')
          .insert({
            title: postTitle,
            content: postContent,
            user_id: user.id,
            group_id: group.id
          })
          .select()
          .single();

        if (postError) {
          console.error(`Error creating post:`, postError);
          continue;
        }

        console.log(`Created post: ${postTitle.substring(0, 50)}...`);

        // Create 3 comments per post using AI
        for (let k = 0; k < 3; k++) {
          const commentContent = await generateWithAI(`Write a comment about: "${postTitle}". Max 100 chars.`);

          const { error: commentError } = await supabaseClient
            .from('comments')
            .insert({
              content: commentContent,
              post_id: post.id,
              user_id: user.id
            });

          if (commentError) {
            console.error(`Error creating comment:`, commentError);
            continue;
          }
        }

        console.log(`Created 3 comments for post`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Seed data generated successfully!',
        stats: {
          categories: 2,
          groups: 2,
          posts: 10,
          comments: 30
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in generate-seed-data:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
