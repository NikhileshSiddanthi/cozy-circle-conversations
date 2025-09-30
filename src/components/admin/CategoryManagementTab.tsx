import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Plus, Edit, Trash2, Flag, Building2, Globe, Users, Crown, TrendingUp, Briefcase, Vote, Gavel, MapPin, FolderOpen, Sparkles, RefreshCw } from 'lucide-react';
import { AdminEmptyState } from './AdminEmptyState';
import { ConfirmationModal } from './ConfirmationModal';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useIconGenerator } from '@/hooks/useIconGenerator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

interface CategoryForm {
  name: string;
  description: string;
  icon: string;
  color_class: string;
}

interface CategoryManagementTabProps {
  categories: Category[];
  onCreateCategory: (form: CategoryForm) => Promise<void>;
  onUpdateCategory: (form: CategoryForm) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
}

export const CategoryManagementTab: React.FC<CategoryManagementTabProps> = ({
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory
}) => {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [regeneratingIcons, setRegeneratingIcons] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    categoryId: string;
    categoryName: string;
  }>({ open: false, categoryId: '', categoryName: '' });
  
  const [categoryForm, setCategoryForm] = useState<CategoryForm>({
    name: '',
    description: '',
    icon: 'Flag',
    color_class: 'bg-primary'
  });

  // Use AI to generate icon suggestion based on category name
  const { icon: suggestedIcon, loading: generatingIcon } = useIconGenerator(
    categoryForm.name, 
    'category'
  );

  // Auto-update icon when AI suggests a new one (only if user hasn't manually changed it)
  useEffect(() => {
    if (suggestedIcon && !editingCategory && categoryForm.name) {
      setCategoryForm(prev => ({ ...prev, icon: suggestedIcon }));
    }
  }, [suggestedIcon, editingCategory, categoryForm.name]);

  const handleSubmit = async () => {
    if (editingCategory) {
      await onUpdateCategory(categoryForm);
    } else {
      await onCreateCategory(categoryForm);
    }
    resetForm();
  };

  const resetForm = () => {
    setCategoryForm({ name: '', description: '', icon: 'Flag', color_class: 'bg-primary' });
    setEditingCategory(null);
    setShowForm(false);
  };

  const startEdit = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      icon: category.icon,
      color_class: category.color_class
    });
    setShowForm(true);
  };

  const handleDelete = async (categoryId: string) => {
    await onDeleteCategory(categoryId);
    setConfirmModal({ open: false, categoryId: '', categoryName: '' });
  };

  const handleRegenerateAllIcons = async () => {
    setRegeneratingIcons(true);
    toast({
      title: "Regenerating Icons",
      description: `Processing ${categories.length} categories...`,
    });

    let successCount = 0;
    let errorCount = 0;

    for (const category of categories) {
      try {
        const { data, error } = await supabase.functions.invoke('generate-icon', {
          body: { name: category.name, type: 'category' }
        });

        if (error) {
          console.error(`Error generating icon for ${category.name}:`, error);
          errorCount++;
          continue;
        }

        if (data?.icon) {
          const { error: updateError } = await supabase
            .from('categories')
            .update({ icon: data.icon })
            .eq('id', category.id);

          if (updateError) {
            console.error(`Error updating icon for ${category.name}:`, updateError);
            errorCount++;
          } else {
            successCount++;
          }
        }
      } catch (err) {
        console.error(`Error processing ${category.name}:`, err);
        errorCount++;
      }
    }

    setRegeneratingIcons(false);
    
    if (successCount > 0) {
      toast({
        title: "Icons Regenerated",
        description: `Successfully updated ${successCount} category icons${errorCount > 0 ? `. ${errorCount} failed.` : '.'}`,
      });
      // Refresh the page to show new icons
      window.location.reload();
    } else {
      toast({
        title: "Error",
        description: "Failed to regenerate icons. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Category Management
            </CardTitle>
            <div className="flex gap-2">
              {categories.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={handleRegenerateAllIcons}
                  disabled={regeneratingIcons}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${regeneratingIcons ? 'animate-spin' : ''}`} />
                  {regeneratingIcons ? 'Regenerating...' : 'Regenerate All Icons'}
                </Button>
              )}
              <Button onClick={() => setShowForm(!showForm)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {showForm && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
              <h4 className="font-medium">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="category-name">Name *</Label>
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
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="flex items-center gap-2">
                      Icon 
                      {generatingIcon && (
                        <Badge variant="secondary" className="gap-1">
                          <Sparkles className="h-3 w-3" />
                          AI Generating...
                        </Badge>
                      )}
                    </Label>
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
                    {categoryForm.name && !editingCategory && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <Sparkles className="h-3 w-3 inline mr-1" />
                        AI will suggest an icon based on the name
                      </p>
                    )}
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
                  <Button onClick={handleSubmit} className="flex-1" disabled={!categoryForm.name.trim()}>
                    {editingCategory ? 'Update' : 'Create'} Category
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {categories.length === 0 ? (
            <AdminEmptyState
              icon={FolderOpen}
              title="No categories yet"
              description="Create your first category to organize groups and content. Categories help users find relevant discussions."
              action={
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Category
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {categories.map((category) => {
                const Icon = iconMap[category.icon] || Flag;
                return (
                  <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${category.color_class}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">{category.name}</p>
                        {category.description && (
                          <p className="text-sm text-muted-foreground">{category.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEdit(category)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit category</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmModal({
                                open: true,
                                categoryId: category.id,
                                categoryName: category.name
                              })}
                              className="text-destructive hover:text-destructive border-destructive/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete category</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmationModal
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal(prev => ({ ...prev, open }))}
        title="Delete Category"
        description={`Are you sure you want to delete "${confirmModal.categoryName}"? This will also delete all groups in this category. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => handleDelete(confirmModal.categoryId)}
      />
    </>
  );
};