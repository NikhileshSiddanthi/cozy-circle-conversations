import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { SuggestGroupModal } from '@/components/SuggestGroupModal';
import { NotificationBell } from '@/components/NotificationBell';
import { 
  LogOut, 
  Search, 
  ArrowLeft,
  Users, 
  MessageCircle,
  TrendingUp,
  Vote,
  Settings
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color_class: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  member_count: number;
  type: string;
  is_public: boolean;
  created_at: string;
}

const CategoryPage = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  
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
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('category_id', categoryId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching groups:', error);
        return;
      }

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Vote className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-primary">COZI</h1>
            </div>
            <div className="hidden md:flex items-center gap-6 ml-8">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                Home
              </Button>
              <Button variant="ghost" size="sm">Categories</Button>
              <Button variant="ghost" size="sm">News</Button>
              <Button variant="ghost" size="sm">AI Assistant</Button>
              {isAdmin && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/admin')}
                  className="text-accent hover:text-accent-foreground"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:block relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search groups, posts..." 
                className="pl-10 w-80"
              />
            </div>
            <NotificationBell />
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin')}
                className="md:hidden"
                aria-label="Admin dashboard"
              >
                <Settings className="h-5 w-5" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user?.email}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Category Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">{category.name}</h2>
              <p className="text-xl text-muted-foreground">
                {category.description}
              </p>
              <div className="flex items-center gap-4 mt-4">
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
                    <Card 
                      key={group.id} 
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => handleGroupClick(group.id)}
                    >
                      <CardHeader>
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {group.member_count} members
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            {group.type.replace("-", " ")}
                          </div>
                        </div>
                      </CardHeader>
                      {group.description && (
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            {group.description}
                          </p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6 sticky top-24">
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