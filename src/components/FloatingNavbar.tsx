import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SearchBar } from "@/components/SearchBar";
import { NotificationBell } from "@/components/NotificationBell";
import {
  Home,
  Grid3X3,
  Newspaper,
  Bot,
  Settings,
  LogOut,
  Menu,
  X
} from "lucide-react";

export const FloatingNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const [isExpanded, setIsExpanded] = useState(false);

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Grid3X3, label: "Categories", path: "/" },
    { icon: Newspaper, label: "News", path: "/news" },
    { icon: Bot, label: "AI Assistant", path: "/" },
  ];

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-background/95 backdrop-blur-md border border-border rounded-full shadow-lg px-4 py-2">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="font-bold text-primary hover:bg-primary/10"
          >
            COZI
          </Button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item, index) => (
              <Button
                key={`${item.path}-${index}`}
                variant={isActive(item.path) ? "default" : "ghost"}
                size="sm"
                onClick={() => navigate(item.path)}
                className="gap-2"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            ))}
          </div>

          {/* Search Bar - Hidden on mobile */}
          <div className="hidden lg:block">
            <SearchBar />
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <NotificationBell />
            
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin')}
                aria-label="Admin dashboard"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}

            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="md:hidden"
              aria-label="Toggle menu"
            >
              {isExpanded ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile expanded menu */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-border md:hidden">
            <div className="flex flex-col gap-2">
              <div className="mb-2">
                <SearchBar />
              </div>
              {navItems.map((item, index) => (
                <Button
                  key={`mobile-${item.path}-${index}`}
                  variant={isActive(item.path) ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    navigate(item.path);
                    setIsExpanded(false);
                  }}
                  className="justify-start gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};