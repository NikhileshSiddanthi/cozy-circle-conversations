import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { ToastProvider } from "@/components/ToastProvider";
import { Header } from "@/components/Header";
import { ContextBar } from "@/components/ContextBar";
import { ThemeInitializer } from "@/components/ThemeInitializer";
import { SimpleTour } from "@/components/SimpleTour";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import CategoryPage from "./pages/CategoryPage";
import GroupPage from "./pages/GroupPage";
import NewsPage from "./pages/NewsPage";
import PostDetailPage from "./pages/PostDetailPage";
import TrendingTopics from "./pages/TrendingTopics";
import TestPage from "./pages/TestPage";
import Profile from "./pages/Profile";
import AllGroupsPage from "./pages/AllGroupsPage";
import ConnectionsPage from "./pages/ConnectionsPage";
import MessagesPage from "./pages/MessagesPage";
import DiscoverConnectionsPage from "./pages/DiscoverConnectionsPage";
import NotFound from "./pages/NotFound";

const App = () => (
  <ToastProvider>
    <TooltipProvider>
      <ThemeInitializer />
      <SimpleTour autoStart={true} />
      <Toaster />
      <Sonner />
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route 
            path="/*" 
            element={
              <>
                <Header />
                <ContextBar />
                <main id="main-content" className="pt-24">
                  <Routes>
                    <Route 
                      path="/" 
                      element={
                        <ProtectedRoute>
                          <Index />
                        </ProtectedRoute>
                      } 
                    />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/category/:categoryId" 
            element={
              <ProtectedRoute>
                <CategoryPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/group/:groupId" 
            element={
              <ProtectedRoute>
                <GroupPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/groups" 
            element={
              <ProtectedRoute>
                <AllGroupsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/news" 
            element={
              <ProtectedRoute>
                <NewsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/post/:postId" 
            element={
              <ProtectedRoute>
                <PostDetailPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/trending-topics" 
            element={
              <ProtectedRoute>
                <TrendingTopics />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/discover" 
            element={
              <ProtectedRoute>
                <DiscoverConnectionsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/connections" 
            element={
              <ProtectedRoute>
                <ConnectionsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/messages" 
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
                      path="/test" 
                      element={
                        <ProtectedRoute>
                          <TestPage />
                        </ProtectedRoute>
                      } 
                    />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
              </>
            } 
          />
        </Routes>
      </div>
    </TooltipProvider>
  </ToastProvider>
);

export default App;
