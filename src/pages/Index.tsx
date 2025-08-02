import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, Users, MessageSquare, TrendingUp } from 'lucide-react';

const Index = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">COZI</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Welcome to COZI</h2>
            <p className="text-xl text-muted-foreground">
              Your social networking platform for moderated discussions
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Groups
                </CardTitle>
                <CardDescription>
                  Join topic-based, personality-driven, or institutional groups
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Connect with communities around politics, schools, eminent people, and more.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Discussions
                </CardTitle>
                <CardDescription>
                  Post content and engage with others
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Share your thoughts, like/dislike posts, and participate in meaningful conversations.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Suggestions
                </CardTitle>
                <CardDescription>
                  Discover articles and news
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Get personalized article and news suggestions based on your interests.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <Card className="inline-block p-6">
              <CardContent className="p-0">
                <h3 className="text-lg font-semibold mb-2">Ready to get started?</h3>
                <p className="text-muted-foreground mb-4">
                  Your authentication system is now set up! Next steps: create groups, implement posting, and add moderation features.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button>Explore Groups</Button>
                  <Button variant="outline">Create Post</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
