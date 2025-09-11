import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SearchBar } from '@/components/SearchBar';
import { NotificationBell } from '@/components/NotificationBell';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Home, Grid3X3, Newspaper, Settings, LogOut, User, Menu, Search } from 'lucide-react';
import { useState } from 'react';

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { icon: Home, label: 'Home', path: '/', key: 'home' },
    { icon: Grid3X3, label: 'Categories', path: '/', key: 'categories' },
    { icon: Newspaper, label: 'News', path: '/news', key: 'news' },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-md border-b border-border z-50">
      <div className="flex items-center justify-between h-full px-3 md:px-6">
        {/* Left: Logo + Sidebar Trigger */}
        <div className="flex items-center gap-2 md:gap-3">
          <SidebarTrigger />
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="font-bold text-lg md:text-xl text-primary hover:bg-primary/10 px-2 md:px-3"
          >
            COZI
          </Button>
        </div>

        {/* Center: Navigation Tabs */}
        <div className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <Button
              key={item.key}
              variant={isActive(item.path) ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate(item.path)}
              className="gap-2"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          ))}
        </div>

        {/* Right: Search + Notifications + Profile */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Mobile Search Button - Shows only on mobile when search is hidden */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden xl:hidden h-8 w-8 md:h-10 md:w-10">
                <Search className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="top" className="h-auto">
              <SheetHeader className="pb-4">
                <SheetTitle>Search</SheetTitle>
              </SheetHeader>
              <SearchBar />
            </SheetContent>
          </Sheet>

          {/* Desktop Search Bar */}
          <div className="hidden xl:block">
            <SearchBar />
          </div>

          {/* Mobile Navigation Menu - Shows only on small screens */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 md:h-10 md:w-10">
                <Menu className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader className="pb-6">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <div className="space-y-2">
                {navItems.map((item) => (
                  <Button
                    key={item.key}
                    variant={isActive(item.path) ? 'default' : 'ghost'}
                    className="w-full justify-start gap-3 h-12"
                    onClick={() => handleNavigation(item.path)}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Button>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          {/* Notifications */}
          <NotificationBell />

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8 md:h-10 md:w-10">
                <Avatar className="h-6 w-6 md:h-8 md:w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs md:text-sm">
                    {user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};