import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Shield, Users, Settings, FolderOpen } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AdminBreadcrumbs } from '@/components/AdminBreadcrumbs';
import { MemberRequestsTab } from '@/components/admin/MemberRequestsTab';
import { CategoryManagementTab } from '@/components/admin/CategoryManagementTab';
import { GroupManagementTab } from '@/components/admin/GroupManagementTab';
import { AllGroupsTab } from '@/components/admin/AllGroupsTab';
import { DataCleanupTab } from '@/components/admin/DataCleanupTab';

// Type definitions


interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color_class: string;
  created_at: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  category_id: string;
  type: string;
  is_public: boolean;
  is_approved: boolean;
  creator_id: string;
  created_at: string;
}

interface NewsCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color_class: string;
}

interface NewsSource {
  id: string;
  name: string;
  domain: string;
  description: string;
  is_verified: boolean;
  is_active: boolean;
}

interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  image_url?: string;
  published_at: string;
  author?: string;
  source_id: string;
  category_id: string;
  is_featured: boolean;
}

interface PendingMember {
  id: string;
  user_id: string;
  group_id: string;
  status: string;
  joined_at: string;
  groups: {
    name: string;
  };
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  // Redirect if not admin
  if (!roleLoading && !isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  // State
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [newsCategories, setNewsCategories] = useState<NewsCategory[]>([]);
  const [newsSources, setNewsSources] = useState<NewsSource[]>([]);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showNewsForm, setShowNewsForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    icon: 'Flag',
    color_class: 'bg-primary'
  });
  
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    category_id: '',
    type: 'topic',
    is_public: true
  });

  const [newsForm, setNewsForm] = useState({
    title: '',
    description: '',
    url: '',
    image_url: '',
    author: '',
    source_id: '',
    category_id: '',
    is_featured: false,
    published_at: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesResult, groupsResult, newsCategoriesResult, newsSourcesResult, newsArticlesResult, pendingMembersResult] = await Promise.all([
        supabase.from('categories').select('*').order('created_at', { ascending: false }),
        supabase.from('groups').select('*').order('created_at', { ascending: false }),
        supabase.from('news_categories').select('*').order('name'),
        supabase.from('news_sources').select('*').order('name'),
        supabase.from('news_articles').select(`
          *,
          source:news_sources(name),
          category:news_categories(name)
        `).order('created_at', { ascending: false }),
        supabase.from('group_members').select(`
          *,
          groups(name)
        `).eq('status', 'pending').order('joined_at', { ascending: false })
      ]);

      if (categoriesResult.error) throw categoriesResult.error;
      if (groupsResult.error) throw groupsResult.error;
      if (newsCategoriesResult.error) throw newsCategoriesResult.error;
      if (newsSourcesResult.error) throw newsSourcesResult.error;
      if (newsArticlesResult.error) throw newsArticlesResult.error;
      if (pendingMembersResult.error) throw pendingMembersResult.error;

      setCategories(categoriesResult.data || []);
      setGroups(groupsResult.data || []);
      setNewsCategories(newsCategoriesResult.data || []);
      setNewsSources(newsSourcesResult.data || []);
      setNewsArticles(newsArticlesResult.data || []);
      setPendingMembers(pendingMembersResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (formData: { name: string; description: string; icon: string; color_class: string }) => {
    try {
      const { error } = await supabase
        .from('categories')
        .insert([formData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Category created successfully",
      });
      
      fetchData();
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCategory = async (formData: { name: string; description: string; icon: string; color_class: string }) => {
    if (!editingCategory) return;
    
    try {
      const { error } = await supabase
        .from('categories')
        .update(formData)
        .eq('id', editingCategory.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Category updated successfully",
      });
      
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '', icon: 'Flag', color_class: 'bg-primary' });
      fetchData();
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
      
      fetchData();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const handleCreateGroup = async () => {
    try {
      const { error } = await supabase
        .from('groups')
        .insert([{
          ...groupForm,
          creator_id: user?.id,
          is_approved: true // Admins create pre-approved groups
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Group created successfully",
      });
      
      setGroupForm({ name: '', description: '', category_id: '', type: 'topic', is_public: true });
      setShowGroupForm(false);
      fetchData();
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive",
      });
    }
  };

  const handleApproveGroup = async (groupId: string, categoryId: string) => {
    try {
      const { error } = await supabase
        .from('groups')
        .update({ 
          is_approved: true,
          category_id: categoryId
        })
        .eq('id', groupId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Group approved and category assigned successfully",
      });
      
      fetchData();
    } catch (error) {
      console.error('Error approving group:', error);
      toast({
        title: "Error",
        description: "Failed to approve group",
        variant: "destructive",
      });
    }
  };

  const handleRejectGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Group suggestion rejected",
      });
      
      fetchData();
    } catch (error) {
      console.error('Error rejecting group:', error);
      toast({
        title: "Error",
        description: "Failed to reject group",
        variant: "destructive",
      });
    }
  };

  // News Management Functions
  const handleCreateNewsArticle = async () => {
    try {
      const { error } = await supabase
        .from('news_articles')
        .insert([{
          ...newsForm,
          published_at: new Date(newsForm.published_at).toISOString()
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "News article created successfully",
      });
      
      setNewsForm({
        title: '',
        description: '',
        url: '',
        image_url: '',
        author: '',
        source_id: '',
        category_id: '',
        is_featured: false,
        published_at: new Date().toISOString().split('T')[0]
      });
      setShowNewsForm(false);
      fetchData();
    } catch (error) {
      console.error('Error creating news article:', error);
      toast({
        title: "Error",
        description: "Failed to create news article",
        variant: "destructive",
      });
    }
  };

  const handleDeleteNewsArticle = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this news article?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('news_articles')
        .delete()
        .eq('id', articleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "News article deleted successfully",
      });
      
      fetchData();
    } catch (error) {
      console.error('Error deleting news article:', error);
      toast({
        title: "Error",
        description: "Failed to delete news article",
        variant: "destructive",
      });
    }
  };

  const handleApproveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .update({ status: 'approved' })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member approved successfully",
      });
      
      fetchData();
    } catch (error) {
      console.error('Error approving member:', error);
      toast({
        title: "Error",
        description: "Failed to approve member",
        variant: "destructive",
      });
    }
  };

  const handleRejectMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member request rejected",
      });
      
      fetchData();
    } catch (error) {
      console.error('Error rejecting member:', error);
      toast({
        title: "Error",
        description: "Failed to reject member",
        variant: "destructive",
      });
    }
  };

  const startEditCategory = (category: Category) => {
    setEditingCategory(category);
    setShowCategoryForm(true); // Show the form when editing
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      icon: category.icon,
      color_class: category.color_class
    });
  };

  const pendingGroups = groups.filter(group => !group.is_approved);
  const approvedGroups = groups.filter(group => group.is_approved);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Shield className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
            <p className="text-muted-foreground">Loading Admin Dashboard...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header with breadcrumbs and back button */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
                <Link to="/" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to App
                </Link>
              </Button>
            </div>
            <AdminBreadcrumbs />
          </div>
        </div>

        {/* Dashboard Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage categories, groups, and content moderation
          </p>
        </div>

        {/* Admin Tabs */}
        <Tabs defaultValue="members" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Member Requests
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Group Suggestions
            </TabsTrigger>
            <TabsTrigger value="all-groups" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              All Groups
            </TabsTrigger>
            <TabsTrigger value="cleanup" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Cleanup
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <MemberRequestsTab
              pendingMembers={pendingMembers}
              onApproveMember={handleApproveMember}
              onRejectMember={handleRejectMember}
            />
          </TabsContent>

          <TabsContent value="categories">
            <CategoryManagementTab
              categories={categories}
              onCreateCategory={handleCreateCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          </TabsContent>

          <TabsContent value="groups">
            <GroupManagementTab
              pendingGroups={pendingGroups}
              categories={categories}
              onApproveGroup={handleApproveGroup}
              onRejectGroup={handleRejectGroup}
            />
          </TabsContent>

          <TabsContent value="all-groups">
            <AllGroupsTab />
          </TabsContent>

          <TabsContent value="cleanup">
            <DataCleanupTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default AdminDashboard;