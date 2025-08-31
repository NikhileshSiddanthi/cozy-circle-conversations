import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { 
  Home, 
  Users, 
  Settings, 
  Plus, 
  TrendingUp,
  Calendar,
  BookOpen
} from 'lucide-react';
import { CreatePostWithValidation } from '@/components/CreatePostWithValidation';
import { SuggestGroupModal } from '@/components/SuggestGroupModal';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const LeftSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { open } = useSidebar();
  const [userGroups, setUserGroups] = useState<{id: string; name: string}[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchUserGroups();
      fetchCategories();
    }
  }, [user]);

  const fetchUserGroups = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups!inner(id, name, is_approved)
        `)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .eq('groups.is_approved', true);

      const groups = data?.map(item => ({
        id: item.groups.id,
        name: item.groups.name
      })) || [];

      setUserGroups(groups);
    } catch (error) {
      console.error('Error fetching user groups:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await supabase
        .from('categories')
        .select('*');
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const mainNavItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: TrendingUp, label: 'Trending Topics', path: '/trending-topics' },
    { icon: BookOpen, label: 'News', path: '/news' },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <Sidebar className="border-r border-border">
      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={isActive(item.path)}
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* My Groups */}
        {userGroups.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>My Groups</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {userGroups.slice(0, 5).map((group) => (
                  <SidebarMenuItem key={group.id}>
                    <SidebarMenuButton
                      isActive={location.pathname === `/group/${group.id}`}
                      onClick={() => navigate(`/group/${group.id}`)}
                    >
                      <Users />
                      <span className="truncate">{group.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Quick Actions */}
        <SidebarGroup>
          <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <div className="px-2 py-1">
                  <CreatePostWithValidation userGroups={userGroups} />
                </div>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <div className="px-2 py-1">
                  <SuggestGroupModal 
                    categories={categories}
                    onSuccess={fetchCategories}
                  />
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={location.pathname === '/admin'}
                    onClick={() => navigate('/admin')}
                  >
                    <Settings />
                    <span>Admin Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
};