import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import wallpaper from '@/assets/professional-wallpaper.jpg';

interface MainLayoutProps {
  children: React.ReactNode;
  rightSidebarContent?: 'trending' | 'news' | 'both';
  contextData?: {
    postTitle?: string;
    categoryId?: string;
    groupId?: string;
  };
}

export const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  rightSidebarContent = 'both',
  contextData 
}) => {
  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full relative">
        {/* Fullscreen Wallpaper Background with Dark Overlay */}
        <div 
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${wallpaper})`,
          }}
        >
          <div className="absolute inset-0 bg-black/70" />
        </div>

        <div className="flex w-full relative z-10">
          {/* Left Sidebar */}
          <LeftSidebar />
          
          {/* Main Content */}
          <main className="flex-1 min-w-0 px-3 py-4 md:px-6 md:py-6">
            <div className="max-w-4xl mx-auto">
              {children}
            </div>
          </main>
          
          {/* Right Sidebar - Hidden on mobile and tablets */}
          <div className="hidden xl:block">
            <RightSidebar 
              content={rightSidebarContent}
              contextData={contextData}
            />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};