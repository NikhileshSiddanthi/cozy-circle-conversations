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

    // Helper function to call AI
    async function generateWithAI(prompt: string): Promise<string> {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a helpful assistant that generates realistic content for a social platform called COZI. Keep responses concise and relevant.' },
            { role: 'user', content: prompt }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    }

    // Category themes
    const categoryThemes = [
      { name: 'Technology', icon: 'Laptop', color: 'bg-blue-500', description: 'All things tech, gadgets, and innovation' },
      { name: 'Sports', icon: 'Trophy', color: 'bg-green-500', description: 'Sports news, teams, and athletic discussions' },
      { name: 'Entertainment', icon: 'Film', color: 'bg-purple-500', description: 'Movies, TV shows, music, and pop culture' },
      { name: 'Science', icon: 'Microscope', color: 'bg-cyan-500', description: 'Scientific discoveries and research' },
      { name: 'Health', icon: 'Heart', color: 'bg-red-500', description: 'Health, fitness, and wellness' },
      { name: 'Business', icon: 'Briefcase', color: 'bg-yellow-500', description: 'Business, finance, and entrepreneurship' },
      { name: 'Education', icon: 'GraduationCap', color: 'bg-indigo-500', description: 'Learning, courses, and academic discussions' },
      { name: 'Travel', icon: 'Plane', color: 'bg-orange-500', description: 'Travel destinations and experiences' },
      { name: 'Food', icon: 'UtensilsCrossed', color: 'bg-pink-500', description: 'Recipes, restaurants, and culinary adventures' },
      { name: 'Gaming', icon: 'Gamepad2', color: 'bg-violet-500', description: 'Video games, esports, and gaming culture' }
    ];

    const categories = [];
    
    // Get or create categories
    for (const theme of categoryThemes) {
      // Try to get existing category first
      let { data: existingCategory } = await supabaseClient
        .from('categories')
        .select('*')
        .eq('name', theme.name)
        .single();

      let category = existingCategory;

      // If doesn't exist, create it
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

      // Create 5 groups per category
      for (let i = 0; i < 5; i++) {
        const groupName = await generateWithAI(
          `Generate a creative and engaging group name for the ${theme.name} category. Just return the name, nothing else. Max 50 characters.`
        );
        
        const groupDescription = await generateWithAI(
          `Write a brief, welcoming description for a group called "${groupName.trim()}" in the ${theme.name} category. Keep it under 150 characters.`
        );

        const { data: group, error: groupError } = await supabaseClient
          .from('groups')
          .insert({
            name: groupName.trim().substring(0, 100),
            description: groupDescription.trim().substring(0, 500),
            category_id: category.id,
            creator_id: user.id,
            is_public: true,
            is_approved: true,
            type: 'discussion'
          })
          .select()
          .single();

        if (groupError) {
          console.error(`Error creating group:`, groupError);
          continue;
        }

        console.log(`Created group: ${groupName.trim()}`);

        // Auto-join creator to the group
        await supabaseClient
          .from('group_members')
          .insert({
            group_id: group.id,
            user_id: user.id,
            role: 'admin',
            status: 'approved'
          });

        // Create 5 posts per group
        for (let j = 0; j < 5; j++) {
          const postTitle = await generateWithAI(
            `Generate an interesting post title related to ${theme.name} and the group "${groupName.trim()}". Keep it engaging and under 100 characters. Just the title, nothing else.`
          );

          const postContent = await generateWithAI(
            `Write engaging post content for a title: "${postTitle.trim()}". Make it informative and conversational. Keep it between 100-300 characters.`
          );

          const { data: post, error: postError } = await supabaseClient
            .from('posts')
            .insert({
              title: postTitle.trim().substring(0, 200),
              content: postContent.trim().substring(0, 2000),
              user_id: user.id,
              group_id: group.id
            })
            .select()
            .single();

          if (postError) {
            console.error(`Error creating post:`, postError);
            continue;
          }

          console.log(`Created post: ${postTitle.trim().substring(0, 50)}...`);

          // Create 5 comments per post
          for (let k = 0; k < 5; k++) {
            const commentContent = await generateWithAI(
              `Write a thoughtful comment responding to this post: "${postTitle.trim()}". Keep it conversational and under 150 characters.`
            );

            const { error: commentError } = await supabaseClient
              .from('comments')
              .insert({
                content: commentContent.trim().substring(0, 1000),
                post_id: post.id,
                user_id: user.id
              });

            if (commentError) {
              console.error(`Error creating comment:`, commentError);
              continue;
            }
          }

          console.log(`Created 5 comments for post`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Seed data generated successfully!',
        stats: {
          categories: categories.length,
          groups: categories.length * 5,
          posts: categories.length * 5 * 5,
          comments: categories.length * 5 * 5 * 5
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
