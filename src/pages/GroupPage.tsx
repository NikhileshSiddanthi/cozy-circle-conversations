import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { NotificationBell } from '@/components/NotificationBell';
import { GroupFeed } from '@/components/GroupFeed';
import { 
  LogOut, 
  Search, 
  ArrowLeft,
  Vote,
  Settings
} from 'lucide-react';

const GroupPage = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();

  if (!groupId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Group not found</p>
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
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {/* Group Feed Component */}
        <GroupFeed groupId={groupId} />
      </div>
    </div>
  );
};

export default GroupPage;