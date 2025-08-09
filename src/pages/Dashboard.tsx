import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { SuggestGroupModal } from '@/components/SuggestGroupModal';
import { NotificationBell } from '@/components/NotificationBell';
import { SearchBar } from '@/components/SearchBar';
import { 
  LogOut, 
  Search, 
  Flag, 
  Building2, 
  Globe, 
  Users, 
  Crown, 
  Briefcase,
  TrendingUp,
  Vote,
  Gavel,
  MapPin,
  Settings
} from 'lucide-react';

// Icon mapping for dynamic categories
const iconMap: { [key: string]: any } = {
  Flag,
  Building2,
  Globe,
  Users,
  Crown,
  TrendingUp,
  Briefcase,
  Vote,
  Gavel,
  MapPin
};

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color_class: string;
  group_count?: number;
}

const trendingGroups = [
  { name: 'US Elections 2024', category: 'Politics', members: 12543 },
  { name: 'Climate Policy Forum', category: 'International', members: 8901 },
  { name: 'Economic Recovery Debate', category: 'Economy', members: 7632 },
  { name: 'Biden Administration', category: 'Personalities', members: 15420 },
  { name: 'Supreme Court Watch', category: 'Social Issues', members: 6234 }
];

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*');

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
        return;
      }

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

      setCategories(categoriesWithCounts);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Vote className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading COZI...</p>
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
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>Home</Button>
              <Button variant="ghost" size="sm">Categories</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/news')}>News</Button>
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
            <div className="hidden md:block">
              <SearchBar />
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Welcome Section */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">Welcome to COZI Political Forum</h2>
              <p className="text-xl text-muted-foreground">
                Engage in moderated discussions on politics, elections, policies, and world leaders
              </p>
            </div>

            {/* Categories Grid */}
            <div className="mb-8">
              <h3 className="text-2xl font-semibold mb-4">Political Categories</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {categories.map((category) => {
                  const Icon = iconMap[category.icon] || Flag;
                  return (
                    <Card 
                      key={category.id} 
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(`/category/${category.id}`)}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${category.color_class}`}>
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg">{category.name}</CardTitle>
                            <Badge variant="secondary" className="mt-1">
                              {category.group_count} groups
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {category.description}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gavel className="h-5 w-5 text-primary" />
                    Start a Discussion
                  </CardTitle>
                  <CardDescription>
                    Create a new political discussion or debate topic
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">Create Post</Button>
                </CardContent>
              </Card>

              <Card className="border-secondary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-secondary" />
                    Suggest a Group
                  </CardTitle>
                  <CardDescription>
                    Propose a new community for political discussions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SuggestGroupModal 
                    categories={categories} 
                    onSuccess={fetchCategories}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6 sticky top-24">
              {/* Trending Groups */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Trending Groups
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {trendingGroups.map((group, index) => (
                    <div key={index} className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-sm leading-tight">{group.name}</p>
                        <p className="text-xs text-muted-foreground">{group.category}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {group.members.toLocaleString()}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* About COZI */}
              <Card>
                <CardHeader>
                  <CardTitle>About COZI</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    COZI is a moderated discussion platform for intellectual political conversations 
                    on topics like elections, policies, global issues, and world leaders.
                  </p>
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    Learn More
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;