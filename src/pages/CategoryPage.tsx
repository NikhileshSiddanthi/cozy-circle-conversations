import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { SuggestGroupModal } from '@/components/SuggestGroupModal';
import { CategoryLiveFeed } from '@/components/CategoryLiveFeed';
import { GroupCard } from '@/components/GroupCard';
import { 
  ArrowLeft,
  Users, 
  MessageCircle,
  Vote
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color_class: string;
  image_url?: string | null;
}

interface Group {
  id: string;
  name: string;
  description: string;
  icon?: string;
  image_url?: string | null;
  member_count: number;
  type: string;
  is_public: boolean;
  created_at: string;
}

const CategoryPage = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [category, setCategory] = useState<Category | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (categoryId) {
      fetchCategoryData();
      fetchGroups();
      fetchCategories();
    }
  }, [categoryId]);

  const fetchCategoryData = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (error) {
        console.error('Error fetching category:', error);
        return;
      }

      setCategory(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      console.log('Fetching groups for category:', categoryId);
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, description, icon, image_url, member_count, type, is_public, created_at')
        .eq('category_id', categoryId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching groups:', error);
        return;
      }

      console.log('Groups fetched:', data?.length || 0, 'groups');
      setGroups(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*');

      if (error) {
        console.error('Error fetching categories:', error);
        return;
      }

      setCategories(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleGroupClick = (groupId: string) => {
    navigate(`/group/${groupId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Vote className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Category not found</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Go Back Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="container mx-auto px-4 py-2">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 xl:col-span-2">
            {/* Category Header */}
            <div className="mb-6">
              <h2 className="text-3xl font-bold mb-2">{category.name}</h2>
              <p className="text-lg text-muted-foreground">
                {category.description}
              </p>
              <div className="flex items-center gap-4 mt-3">
                <Badge variant="secondary">
                  {groups.length} groups
                </Badge>
              </div>
            </div>

            {/* Groups Grid */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-semibold">Groups in this category</h3>
                <SuggestGroupModal 
                  categories={categories} 
                  onSuccess={fetchGroups}
                />
              </div>
              
              {groups.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No groups yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Be the first to suggest a group in this category!
                    </p>
                    <SuggestGroupModal 
                      categories={categories} 
                      onSuccess={fetchGroups}
                    />
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      onClick={() => handleGroupClick(group.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Live Feed */}
          <div className="lg:col-span-1 xl:col-span-1">
            <div className="sticky top-20">
              <CategoryLiveFeed categoryId={categoryId!} />
            </div>
          </div>

          {/* Far Right Sidebar - Quick Actions */}
          <div className="hidden xl:block xl:col-span-1">
            <div className="space-y-6 sticky top-20">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <SuggestGroupModal 
                    categories={categories} 
                    onSuccess={fetchGroups}
                  />
                  <Button variant="outline" className="w-full">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Browse All Posts
                  </Button>
                </CardContent>
              </Card>

              {/* Category Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Category Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Groups</span>
                    <span className="font-medium">{groups.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Public Groups</span>
                    <span className="font-medium">{groups.filter(g => g.is_public).length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryPage;