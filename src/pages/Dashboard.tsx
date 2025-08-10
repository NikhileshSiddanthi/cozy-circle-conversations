import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { SuggestGroupModal } from '@/components/SuggestGroupModal';
import { FloatingNavbar } from '@/components/FloatingNavbar';
import { useTrendingGroups } from '@/hooks/useTrendingGroups';
import { 
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
  Hash,
  ArrowUp,
  ArrowDown
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

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { trendingGroups, loading: trendingLoading } = useTrendingGroups(7);

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
      <FloatingNavbar />
      
      <div className="container mx-auto px-4 py-20">
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
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Trending Groups
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/trending-topics')}
                      className="text-xs"
                    >
                      <Hash className="h-3 w-3 mr-1" />
                      Topics
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {trendingLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-muted rounded mb-1"></div>
                          <div className="h-3 bg-muted rounded w-2/3"></div>
                        </div>
                      ))}
                    </div>
                  ) : trendingGroups.length > 0 ? (
                    trendingGroups.map((group, index) => (
                      <div 
                        key={group.id} 
                        className="flex justify-between items-start cursor-pointer hover:bg-muted/50 p-2 rounded-lg -m-2"
                        onClick={() => navigate(`/group/${group.id}`)}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm leading-tight">{group.name}</p>
                          <p className="text-xs text-muted-foreground">{group.category_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {group.member_count.toLocaleString()} members
                            </Badge>
                            {group.trend_change !== 0 && (
                              <div className={`flex items-center gap-1 text-xs ${
                                group.trend_change > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {group.trend_change > 0 ? (
                                  <ArrowUp className="h-3 w-3" />
                                ) : (
                                  <ArrowDown className="h-3 w-3" />
                                )}
                                {Math.abs(group.trend_change)}%
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No trending groups found
                    </p>
                  )}
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