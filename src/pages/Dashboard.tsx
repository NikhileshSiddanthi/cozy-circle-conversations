import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  MapPin
} from 'lucide-react';

const politicalCategories = [
  {
    id: 'politics',
    title: 'Politics',
    icon: Flag,
    description: 'Political discussions, parties, and governance',
    color: 'bg-primary',
    groupCount: 24
  },
  {
    id: 'economy',
    title: 'Economy & Business',
    icon: TrendingUp,
    description: 'Economic policies, business regulations, and financial matters',
    color: 'bg-secondary',
    groupCount: 18
  },
  {
    id: 'international',
    title: 'International Issues',
    icon: Globe,
    description: 'Global affairs, international relations, and world events',
    color: 'bg-accent',
    groupCount: 31
  },
  {
    id: 'social',
    title: 'Social Issues',
    icon: Users,
    description: 'Social policies, civil rights, and community matters',
    color: 'bg-primary',
    groupCount: 15
  },
  {
    id: 'personalities',
    title: 'Personalities',
    icon: Crown,
    description: 'Political leaders, public figures, and influencers',
    color: 'bg-secondary',
    groupCount: 42
  },
  {
    id: 'organizations',
    title: 'Organizations',
    icon: Building2,
    description: 'Political parties, institutions, and committees',
    color: 'bg-accent',
    groupCount: 27
  }
];

const trendingGroups = [
  { name: 'US Elections 2024', category: 'Politics', members: 12543 },
  { name: 'Climate Policy Forum', category: 'International', members: 8901 },
  { name: 'Economic Recovery Debate', category: 'Economy', members: 7632 },
  { name: 'Biden Administration', category: 'Personalities', members: 15420 },
  { name: 'Supreme Court Watch', category: 'Social Issues', members: 6234 }
];

const Dashboard = () => {
  const { user, signOut } = useAuth();

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
              <Button variant="ghost" size="sm">Home</Button>
              <Button variant="ghost" size="sm">Categories</Button>
              <Button variant="ghost" size="sm">News</Button>
              <Button variant="ghost" size="sm">AI Assistant</Button>
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
                {politicalCategories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <Card key={category.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${category.color}`}>
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg">{category.title}</CardTitle>
                            <Badge variant="secondary" className="mt-1">
                              {category.groupCount} groups
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
                  <Button variant="secondary" className="w-full">Suggest Group</Button>
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