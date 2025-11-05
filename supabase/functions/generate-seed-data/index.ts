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

    // Template-based content generators (no AI needed)
    const groupTemplates = {
      'Technology': ['Tech Innovators Hub', 'Coding Best Practices', 'AI & Machine Learning', 'Web Development Tips', 'Mobile App Builders'],
      'Sports': ['Football Fans United', 'Basketball Discussion', 'Fitness & Training', 'Extreme Sports', 'Local Sports Teams'],
      'Entertainment': ['Movie Buffs Club', 'Music Lovers Society', 'TV Series Reviews', 'Gaming Community', 'Celebrity News'],
      'Science': ['Space Exploration', 'Climate Science', 'Biology Research', 'Physics Discussion', 'Chemistry Lab'],
      'Health': ['Nutrition & Diet', 'Mental Wellness', 'Fitness Journey', 'Medical Insights', 'Healthy Living'],
      'Business': ['Startup Founders', 'Marketing Strategies', 'Investment Tips', 'Leadership Skills', 'Entrepreneurship'],
      'Education': ['Online Learning', 'Study Techniques', 'Career Development', 'Teaching Methods', 'Academic Research'],
      'Travel': ['Adventure Seekers', 'Budget Travel', 'Cultural Experiences', 'Photography Tours', 'Local Food Discovery'],
      'Food': ['Cooking Recipes', 'Restaurant Reviews', 'Baking Enthusiasts', 'International Cuisine', 'Healthy Eating'],
      'Gaming': ['PC Gaming', 'Console Players', 'Indie Games', 'Esports Community', 'Game Development']
    };

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

      // Create 5 groups per category using templates
      const templates = groupTemplates[theme.name as keyof typeof groupTemplates] || groupTemplates['Technology'];
      
      for (let i = 0; i < 5; i++) {
        const groupName = templates[i];
        const groupDescription = `A community for ${theme.name.toLowerCase()} enthusiasts to connect, share, and learn together.`;

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

        // Create 5 posts per group using templates
        for (let j = 0; j < 5; j++) {
          const template = postTemplates[j];
          const postTitle = `${template.title} - ${groupName}`;
          const postContent = template.content;

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

          // Create 5 comments per post using templates
          for (let k = 0; k < 5; k++) {
            const commentContent = commentTemplates[k];

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
