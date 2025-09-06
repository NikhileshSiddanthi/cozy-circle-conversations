import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { CategoryCard } from '@/components/CategoryCard';

import { Vote } from 'lucide-react';

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

      // Fetch group counts for each category
      const categoriesWithCounts = await Promise.all(
        (categoriesData || []).map(async (category) => {
          const { count } = await supabase
            .from('groups')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id)
            .eq('is_approved', true);

          return {
            ...category,
            group_count: count || 0
          };
        })
      );

      console.log('Categories with counts:', categoriesWithCounts);
      setCategories(categoriesWithCounts);
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

  return (
    <MainLayout>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3">Welcome to COZI</h1>
        <p className="text-xl text-muted-foreground">
          Connect, discuss, and engage with political communities
        </p>
      </div>

      {/* Categories Grid */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-6">Political Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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