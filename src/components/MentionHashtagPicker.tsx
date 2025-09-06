import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Hash } from 'lucide-react';

interface MentionHashtagPickerProps {
  type: 'mention' | 'hashtag';
  query: string;
  groupId?: string;
  onSelect: (item: any) => void;
}

interface UserItem {
  id: string;
  name: string;
  avatar_url?: string;
  display_name?: string;
}

interface HashtagItem {
  id: string;
  name: string;
  count: number;
}

export const MentionHashtagPicker: React.FC<MentionHashtagPickerProps> = ({
  type,
  query,
  groupId,
  onSelect
}) => {
  const [items, setItems] = useState<(UserItem | HashtagItem)[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (query.length < 1) {
      setItems([]);
      return;
    }

    const searchItems = async () => {
      setLoading(true);
      try {
        if (type === 'mention') {
          await searchUsers();
        } else {
          await searchHashtags();
        }
      } catch (error) {
        console.error('Search failed:', error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchItems, 300);
    return () => clearTimeout(debounceTimer);
  }, [query, type, groupId]);

  const searchUsers = async () => {
    let userQuery = supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .ilike('display_name', `%${query}%`)
      .limit(5);

    // If groupId provided, filter by group members
    if (groupId) {
      const { data: memberIds } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('status', 'approved');

      if (memberIds && memberIds.length > 0) {
        const userIds = memberIds.map(m => m.user_id);
        userQuery = userQuery.in('user_id', userIds);
      }
    }

    const { data: users, error } = await userQuery;

    if (error) throw error;

    const formattedUsers = (users || []).map(user => ({
      id: user.user_id,
      name: user.display_name || 'Anonymous',
      avatar_url: user.avatar_url,
      display_name: user.display_name
    }));

    setItems(formattedUsers);
    setSelectedIndex(0);
  };

  const searchHashtags = async () => {
    // For now, provide some popular hashtags
    // In a real implementation, you'd query from a hashtags table or extract from posts
    const popularHashtags = [
      { id: '1', name: 'ai', count: 156 },
      { id: '2', name: 'technology', count: 89 },
      { id: '3', name: 'programming', count: 67 },
      { id: '4', name: 'machinelearning', count: 45 },
      { id: '5', name: 'innovation', count: 34 },
      { id: '6', name: 'discussion', count: 23 },
      { id: '7', name: 'community', count: 19 },
      { id: '8', name: 'news', count: 15 }
    ];

    const filtered = popularHashtags
      .filter(tag => tag.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);

    // Add custom hashtag option if query doesn't match existing ones
    if (query && !filtered.some(tag => tag.name.toLowerCase() === query.toLowerCase())) {
      filtered.unshift({
        id: 'custom',
        name: query,
        count: 0
      });
    }

    setItems(filtered);
    setSelectedIndex(0);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (items.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + items.length) % items.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (items[selectedIndex]) {
          onSelect(items[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onSelect(null);
        break;
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex]);

  if (loading) {
    return (
      <Card className="absolute top-full left-0 mt-1 w-64 z-50">
        <CardContent className="p-2">
          <p className="text-sm text-muted-foreground">Searching...</p>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="absolute top-full left-0 mt-1 w-64 z-50 shadow-lg">
      <CardContent className="p-1">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
              index === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
            }`}
            onClick={() => onSelect(item)}
          >
            {type === 'mention' ? (
              <>
                <Avatar className="h-6 w-6">
                  <AvatarImage src={(item as UserItem).avatar_url} />
                  <AvatarFallback className="text-xs">
                    {item.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{item.name.toLowerCase().replace(/\s+/g, '')}
                  </p>
                </div>
                <User className="h-3 w-3 text-muted-foreground" />
              </>
            ) : (
              <>
                <div className="flex items-center justify-center h-6 w-6 bg-primary/10 rounded">
                  <Hash className="h-3 w-3 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    #{item.name}
                  </p>
                  {(item as HashtagItem).count > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {(item as HashtagItem).count} posts
                    </p>
                  )}
                </div>
                {(item as HashtagItem).count > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {(item as HashtagItem).count}
                  </Badge>
                )}
              </>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};