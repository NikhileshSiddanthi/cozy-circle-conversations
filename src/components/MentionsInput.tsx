import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';

interface User {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface MentionsInputProps {
  query: string;
  onSelect: (user: User) => void;
  groupId?: string;
}

export const MentionsInput: React.FC<MentionsInputProps> = ({
  query,
  onSelect,
  groupId
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 1) {
      setUsers([]);
      return;
    }

    searchUsers(query);
  }, [query, groupId]);

  const searchUsers = async (searchQuery: string) => {
    setLoading(true);
    try {
      let data, error;

      if (groupId) {
        // First get group member user IDs
        const { data: memberData, error: memberError } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', groupId)
          .eq('status', 'approved');

        if (memberError) throw memberError;

        const memberIds = memberData?.map(m => m.user_id) || [];

        if (memberIds.length === 0) {
          setUsers([]);
          return;
        }

        // Then search profiles in those member IDs
        const profilesQuery = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', memberIds)
          .ilike('display_name', `%${searchQuery}%`)
          .limit(5);

        data = profilesQuery.data;
        error = profilesQuery.error;
      } else {
        // Search all profiles
        const profilesQuery = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .ilike('display_name', `%${searchQuery}%`)
          .limit(5);

        data = profilesQuery.data;
        error = profilesQuery.error;
      }

      if (error) throw error;

      const formattedUsers = data?.map((user: any) => ({
        id: user.user_id,
        display_name: user.display_name,
        avatar_url: user.avatar_url
      })) || [];

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error searching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  if (!query || users.length === 0) {
    return null;
  }

  return (
    <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg">
      <CardContent className="p-2">
        <div className="space-y-1">
          {loading ? (
            <div className="p-2 text-sm text-muted-foreground text-center">
              Searching...
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                onClick={() => onSelect(user)}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {user.display_name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {user.display_name || 'Anonymous'}
                </span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};