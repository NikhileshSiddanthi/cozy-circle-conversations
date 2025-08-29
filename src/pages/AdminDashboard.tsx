import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock,
  Flag,
  Building2,
  Globe,
  Users,
  Crown,
  TrendingUp,
  Briefcase,
  Vote,
  Gavel,
  MapPin,
  Newspaper,
  Link,
  Calendar
} from 'lucide-react';

// Icon mapping for categories
const iconMap: { [key: string]: any } = {
  Flag, Building2, Globe, Users, Crown, TrendingUp, Briefcase, Vote, Gavel, MapPin
};

const iconOptions = [
  { value: 'Flag', label: 'Flag', icon: Flag },
  { value: 'Building2', label: 'Building', icon: Building2 },
  { value: 'Globe', label: 'Globe', icon: Globe },
  { value: 'Users', label: 'Users', icon: Users },
  { value: 'Crown', label: 'Crown', icon: Crown },
  { value: 'TrendingUp', label: 'Trending Up', icon: TrendingUp },
  { value: 'Briefcase', label: 'Briefcase', icon: Briefcase },
  { value: 'Vote', label: 'Vote', icon: Vote },
  { value: 'Gavel', label: 'Gavel', icon: Gavel },
  { value: 'MapPin', label: 'Map Pin', icon: MapPin }
];

const colorOptions = [
  { value: 'bg-primary', label: 'Primary Blue' },
  { value: 'bg-secondary', label: 'Secondary Red' },
  { value: 'bg-accent', label: 'Accent Purple' },
  { value: 'bg-destructive', label: 'Destructive Red' },
  { value: 'bg-muted', label: 'Muted Gray' }
];

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

  const handleCreateCategory = async () => {
    try {
      const { error } = await supabase
        .from('categories')
        .insert([categoryForm]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Category created successfully",
      });
      
      setCategoryForm({ name: '', description: '', icon: 'Flag', color_class: 'bg-primary' });
      setShowCategoryForm(false);
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

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;
    
    try {
      const { error } = await supabase
        .from('categories')
        .update(categoryForm)
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
    if (!confirm('Are you sure you want to delete this category? This will also delete all groups in this category.')) {
      return;
    }
    
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

  const handleApproveGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('groups')
        .update({ is_approved: true })
        .eq('id', groupId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Group approved successfully",
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Settings className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-xl text-muted-foreground">
            Manage categories, groups, and content moderation
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Member Management */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Member Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No pending member requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Pending Requests ({pendingMembers.length})
                    </h4>
                    {pendingMembers.map((member) => (
                      <div key={member.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">User ID: {member.user_id.slice(0, 8)}...</p>
                            <p className="text-sm text-muted-foreground">
                              Group: {member.groups?.name || 'Unknown Group'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Requested: {new Date(member.joined_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveMember(member.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRejectMember(member.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          {/* Categories Management */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Category Management
                  </CardTitle>
                  <Button onClick={() => setShowCategoryForm(!showCategoryForm)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {showCategoryForm && (
                  <div className="border rounded-lg p-4 space-y-4">
                    <h4 className="font-medium">
                      {editingCategory ? 'Edit Category' : 'Create New Category'}
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="category-name">Name</Label>
                        <Input
                          id="category-name"
                          value={categoryForm.name}
                          onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                          placeholder="Category name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="category-description">Description</Label>
                        <Textarea
                          id="category-description"
                          value={categoryForm.description}
                          onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                          placeholder="Category description"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Icon</Label>
                          <Select value={categoryForm.icon} onValueChange={(value) => setCategoryForm({ ...categoryForm, icon: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {iconOptions.map((option) => {
                                const IconComponent = option.icon;
                                return (
                                  <SelectItem key={option.value} value={option.value}>
                                    <div className="flex items-center gap-2">
                                      <IconComponent className="h-4 w-4" />
                                      {option.label}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Color</Label>
                          <Select value={categoryForm.color_class} onValueChange={(value) => setCategoryForm({ ...categoryForm, color_class: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {colorOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
                          className="flex-1"
                        >
                          {editingCategory ? 'Update' : 'Create'} Category
                        </Button>
                        {editingCategory && (
                          <Button 
                            variant="outline"
                            onClick={() => {
                              setEditingCategory(null);
                              setCategoryForm({ name: '', description: '', icon: 'Flag', color_class: 'bg-primary' });
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {categories.map((category) => {
                    const Icon = iconMap[category.icon] || Flag;
                    return (
                      <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${category.color_class}`}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium">{category.name}</p>
                            <p className="text-sm text-muted-foreground">{category.description}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditCategory(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteCategory(category.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Groups Management */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Group Management
                  </CardTitle>
                  <Button onClick={() => setShowGroupForm(!showGroupForm)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Group
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {showGroupForm && (
                  <div className="border rounded-lg p-4 space-y-4">
                    <h4 className="font-medium">Create New Group</h4>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="group-name">Name</Label>
                        <Input
                          id="group-name"
                          value={groupForm.name}
                          onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                          placeholder="Group name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="group-description">Description</Label>
                        <Textarea
                          id="group-description"
                          value={groupForm.description}
                          onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                          placeholder="Group description"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Category</Label>
                          <Select value={groupForm.category_id} onValueChange={(value) => setGroupForm({ ...groupForm, category_id: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Type</Label>
                          <Select value={groupForm.type} onValueChange={(value) => setGroupForm({ ...groupForm, type: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="topic">Topic-based</SelectItem>
                              <SelectItem value="personality">Personality-driven</SelectItem>
                              <SelectItem value="institutional">Institutional</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="is-public"
                          checked={groupForm.is_public}
                          onChange={(e) => setGroupForm({ ...groupForm, is_public: e.target.checked })}
                        />
                        <Label htmlFor="is-public">Public group</Label>
                      </div>
                      <Button onClick={handleCreateGroup} className="w-full">
                        Create Group
                      </Button>
                    </div>
                  </div>
                )}

                {/* Pending Groups */}
                {pendingGroups.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Pending Approval ({pendingGroups.length})
                    </h4>
                    {pendingGroups.map((group) => (
                      <div key={group.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{group.name}</p>
                            <p className="text-sm text-muted-foreground">{group.description}</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="secondary">{group.type}</Badge>
                              <Badge variant={group.is_public ? "default" : "outline"}>
                                {group.is_public ? "Public" : "Private"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveGroup(group.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRejectGroup(group.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Separator />

                {/* Approved Groups */}
                <div className="space-y-3">
                  <h4 className="font-medium">Approved Groups ({approvedGroups.length})</h4>
                  {approvedGroups.slice(0, 5).map((group) => (
                    <div key={group.id} className="border rounded-lg p-3">
                      <p className="font-medium">{group.name}</p>
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="secondary">{group.type}</Badge>
                        <Badge variant={group.is_public ? "default" : "outline"}>
                          {group.is_public ? "Public" : "Private"}
                        </Badge>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Approved
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {approvedGroups.length > 5 && (
                    <p className="text-sm text-muted-foreground">
                      And {approvedGroups.length - 5} more groups...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* News Management Section */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Newspaper className="h-5 w-5" />
                  News Management
                </CardTitle>
                <Button onClick={() => setShowNewsForm(!showNewsForm)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add News Article
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showNewsForm && (
                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="font-medium">Add News Article</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="news-title">Title</Label>
                        <Input
                          id="news-title"
                          value={newsForm.title}
                          onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                          placeholder="Article title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="news-description">Description</Label>
                        <Textarea
                          id="news-description"
                          value={newsForm.description}
                          onChange={(e) => setNewsForm({ ...newsForm, description: e.target.value })}
                          placeholder="Article description"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="news-url">URL</Label>
                        <Input
                          id="news-url"
                          value={newsForm.url}
                          onChange={(e) => setNewsForm({ ...newsForm, url: e.target.value })}
                          placeholder="https://example.com/article"
                        />
                      </div>
                      <div>
                        <Label htmlFor="news-image">Image URL</Label>
                        <Input
                          id="news-image"
                          value={newsForm.image_url}
                          onChange={(e) => setNewsForm({ ...newsForm, image_url: e.target.value })}
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="news-author">Author</Label>
                        <Input
                          id="news-author"
                          value={newsForm.author}
                          onChange={(e) => setNewsForm({ ...newsForm, author: e.target.value })}
                          placeholder="Author name"
                        />
                      </div>
                      <div>
                        <Label>Source</Label>
                        <Select value={newsForm.source_id} onValueChange={(value) => setNewsForm({ ...newsForm, source_id: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select news source" />
                          </SelectTrigger>
                          <SelectContent>
                            {newsSources.filter(source => source.is_verified && source.is_active).map((source) => (
                              <SelectItem key={source.id} value={source.id}>
                                {source.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Category</Label>
                        <Select value={newsForm.category_id} onValueChange={(value) => setNewsForm({ ...newsForm, category_id: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {newsCategories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="news-date">Published Date</Label>
                        <Input
                          id="news-date"
                          type="date"
                          value={newsForm.published_at}
                          onChange={(e) => setNewsForm({ ...newsForm, published_at: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="is-featured"
                          checked={newsForm.is_featured}
                          onChange={(e) => setNewsForm({ ...newsForm, is_featured: e.target.checked })}
                        />
                        <Label htmlFor="is-featured">Featured article</Label>
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleCreateNewsArticle} className="w-full">
                    Add News Article
                  </Button>
                </div>
              )}

              {/* News Articles List */}
              <div className="space-y-3">
                <h4 className="font-medium">Recent Articles ({newsArticles.length})</h4>
                {newsArticles.length === 0 && (
                  <div className="text-center py-8 border rounded-lg">
                    <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No news articles yet. Add some articles to get started!</p>
                  </div>
                )}
                {newsArticles.slice(0, 10).map((article: any) => (
                  <div key={article.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h5 className="font-medium line-clamp-2">{article.title}</h5>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{article.description}</p>
                        <div className="flex gap-2 mt-3">
                          <Badge variant="secondary">{article.category?.name || 'Unknown'}</Badge>
                          <Badge variant="outline">{article.source?.name || 'Unknown'}</Badge>
                          {article.is_featured && (
                            <Badge className="bg-yellow-100 text-yellow-800">Featured</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>By {article.author || 'Unknown'}</span>
                          <span>{new Date(article.published_at).toLocaleDateString()}</span>
                          <a href={article.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
                            <Link className="h-3 w-3" />
                            View Article
                          </a>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteNewsArticle(article.id)}
                        className="text-destructive hover:text-destructive ml-4"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {newsArticles.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center">
                    And {newsArticles.length - 10} more articles...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;