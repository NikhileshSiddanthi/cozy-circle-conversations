import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { CategoryCard } from '@/components/CategoryCard';
import { Button } from '@/components/ui/button';
import { Vote, HelpCircle } from 'lucide-react';
import { useSimpleTour } from '@/components/SimpleTour';

interface Category {
  id: string;
  name: string;
  description?: string | null;
  icon: string;
  color_class: string;
  group_count?: number;
  latest_post_at?: string | null;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { startTour } = useSimpleTour();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

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

      // Fetch group counts and latest post activity for each category
      const categoriesWithCounts = await Promise.all(
        (categoriesData || []).map(async (category) => {
          const { count } = await supabase
            .from('groups')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id)
            .eq('is_approved', true);

          // Get the latest post timestamp for this category
          const { data: latestPost } = await supabase
            .from('posts')
            .select(`
              created_at,
              groups!inner(category_id)
            `)
            .eq('groups.category_id', category.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...category,
            group_count: count || 0,
            latest_post_at: latestPost?.created_at || null
          };
        })
      );

      // Sort categories by latest post activity (most recent first)
      const sortedCategories = categoriesWithCounts.sort((a, b) => {
        // Categories with no posts go to the end
        if (!a.latest_post_at && !b.latest_post_at) return 0;
        if (!a.latest_post_at) return 1;
        if (!b.latest_post_at) return -1;
        
        // Sort by latest post date (most recent first)
        return new Date(b.latest_post_at).getTime() - new Date(a.latest_post_at).getTime();
      });

      console.log('Categories with counts and latest activity:', sortedCategories);
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
    startTour();
  };

  return (
    <MainLayout>
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
        <div 
          data-tour="categories-grid"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6"
        >
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