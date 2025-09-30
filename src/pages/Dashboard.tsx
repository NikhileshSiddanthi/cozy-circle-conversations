import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { CategoryCard } from '@/components/CategoryCard';
import { TourGuide } from '@/components/TourGuide';
import { Button } from '@/components/ui/button';
import { Vote, HelpCircle } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color_class: string;
  group_count?: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [user]);

  const fetchCategories = async () => {
    try {
      console.log('Fetching categories...');
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*');

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
        setLoading(false);
        return;
      }

      console.log('Categories fetched:', categoriesData?.length || 0);
      console.log('Categories data:', categoriesData);

      // Fetch group counts and engagement metrics for each category
      const categoriesWithCounts = await Promise.all(
        (categoriesData || []).map(async (category) => {
          const { count } = await supabase
            .from('groups')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id)
            .eq('is_approved', true);

          // Calculate engagement score (posts + comments + reactions in last 30 days)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const { data: engagementData } = await supabase
            .from('posts')
            .select(`
              id,
              like_count,
              comment_count,
              created_at,
              groups!inner(category_id)
            `)
            .eq('groups.category_id', category.id)
            .gte('created_at', thirtyDaysAgo.toISOString());

          let engagementScore = 0;
          if (engagementData) {
            engagementScore = engagementData.reduce((sum, post) => {
              return sum + (post.like_count || 0) + (post.comment_count || 0) + 1; // +1 for the post itself
            }, 0);
          }

          return {
            ...category,
            group_count: count || 0,
            engagement_score: engagementScore
          };
        })
      );

      // Sort categories by engagement, but keep Organizations and Personalities at end unless they have high engagement
      const sortedCategories = categoriesWithCounts.sort((a, b) => {
        const aIsSpecial = ['Organizations', 'Personalities'].includes(a.name);
        const bIsSpecial = ['Organizations', 'Personalities'].includes(b.name);
        
        // If both are special or neither are special, sort by engagement
        if (aIsSpecial === bIsSpecial) {
          return (b.engagement_score || 0) - (a.engagement_score || 0);
        }
        
        // If only one is special, check if it has significant engagement (>10)
        if (aIsSpecial && (a.engagement_score || 0) < 10) return 1; // Move to end
        if (bIsSpecial && (b.engagement_score || 0) < 10) return -1; // Move to end
        
        // Otherwise sort by engagement
        return (b.engagement_score || 0) - (a.engagement_score || 0);
      });

      console.log('Categories with counts and engagement:', sortedCategories);
      setCategories(sortedCategories);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <Vote className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
            <p className="text-muted-foreground">Loading COZI...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const handleStartTour = () => {
    // Clear the completed flag so tour can be shown
    localStorage.removeItem('cozi_tour_completed');
    setShowTour(true);
  };

  return (
    <MainLayout>
      {/* Tour Guide - Auto-start for new users OR manual trigger */}
      <TourGuide 
        autoStart={!showTour} 
        forceShow={showTour}
        onComplete={() => setShowTour(false)} 
      />

      {/* Welcome Section */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold mb-2 md:mb-3">Welcome to COZI</h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              For A Free, Fair & Open Public Sphere
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartTour}
            className="gap-2"
          >
            <HelpCircle className="h-4 w-4" />
            App Tour
          </Button>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="mb-6 md:mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onClick={() => navigate(`/category/${category.id}`)}
            />
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;