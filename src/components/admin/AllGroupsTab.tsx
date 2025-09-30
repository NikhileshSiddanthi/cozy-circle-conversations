import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, RefreshCw, Sparkles, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdminEmptyState } from './AdminEmptyState';

interface Group {
  id: string;
  name: string;
  description: string;
  type: string;
  is_public: boolean;
  is_approved: boolean;
  member_count: number;
}

export const AllGroupsTab: React.FC = () => {
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [regeneratingIcons, setRegeneratingIcons] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, description, type, is_public, is_approved, member_count')
        .eq('is_approved', true)
        .order('name');

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast({
        title: "Error",
        description: "Failed to load groups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateAllIcons = async () => {
    setRegeneratingIcons(true);
    toast({
      title: "Regenerating Icons",
      description: `Processing ${groups.length} groups...`,
    });

    let successCount = 0;
    let errorCount = 0;

    for (const group of groups) {
      try {
        const { data, error } = await supabase.functions.invoke('generate-icon', {
          body: { name: group.name, type: 'group' }
        });

        if (error) {
          console.error(`Error generating icon for ${group.name}:`, error);
          errorCount++;
          continue;
        }

        if (data?.icon) {
          // Note: Groups don't have an icon column in the schema yet
          // This would need to be added via migration if we want to store icons for groups
          console.log(`Would update ${group.name} with icon: ${data.icon}`);
          successCount++;
        }
      } catch (err) {
        console.error(`Error processing ${group.name}:`, err);
        errorCount++;
      }
    }

    setRegeneratingIcons(false);
    
    toast({
      title: "Icons Generated",
      description: `Successfully generated ${successCount} group icons${errorCount > 0 ? `. ${errorCount} failed.` : '.'}`,
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'topic': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'personality': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'institutional': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading groups...</div>;
  }

  if (groups.length === 0) {
    return (
      <AdminEmptyState
        icon={Users}
        title="No approved groups"
        description="There are no approved groups yet. Approve some group suggestions first."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Groups
            <Badge variant="secondary" className="ml-2">
              {groups.length}
            </Badge>
          </CardTitle>
          <Button 
            variant="outline" 
            onClick={handleRegenerateAllIcons}
            disabled={regeneratingIcons}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${regeneratingIcons ? 'animate-spin' : ''}`} />
            {regeneratingIcons ? 'Regenerating...' : 'Regenerate All Icons'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {groups.map((group) => (
          <div key={group.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <p className="font-medium">{group.name}</p>
                <Badge className={getTypeColor(group.type)}>
                  {group.type}
                </Badge>
                <Badge variant={group.is_public ? 'outline' : 'secondary'} className="text-xs">
                  <Eye className="h-3 w-3 mr-1" />
                  {group.is_public ? 'Public' : 'Private'}
                </Badge>
              </div>
              {group.description && (
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {group.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {group.member_count} members
              </p>
            </div>
          </div>
        ))}
        <div className="pt-4 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 inline mr-1" />
          AI will analyze each group name and suggest the most relevant icon
        </div>
      </CardContent>
    </Card>
  );
};
