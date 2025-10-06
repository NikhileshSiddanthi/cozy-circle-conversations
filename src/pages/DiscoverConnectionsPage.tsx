import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ConnectionRequestButton } from '@/components/ConnectionRequestButton';
import { Users } from 'lucide-react';

interface UserWithGroups {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  mutual_groups: Array<{ id: string; name: string }>;
}

const DiscoverConnectionsPage = () => {
  const { user } = useAuth();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['discover-connections', user?.id],
    queryFn: async () => {
      // Get user's groups
      const { data: userGroups, error: groupsError } = await supabase
        .from('group_members')
        .select('group_id, groups(id, name)')
        .eq('user_id', user?.id)
        .eq('status', 'approved');

      if (groupsError) throw groupsError;

      const groupIds = userGroups?.map(g => g.group_id) || [];

      if (groupIds.length === 0) return [];

      // Get other users in those groups
      const { data: otherMembers, error: membersError } = await supabase
        .from('group_members')
        .select('user_id, group_id, groups(id, name)')
        .in('group_id', groupIds)
        .eq('status', 'approved')
        .neq('user_id', user?.id);

      if (membersError) throw membersError;

      // Group by user_id
      const userMap = new Map<string, UserWithGroups>();
      otherMembers?.forEach((member: any) => {
        if (!userMap.has(member.user_id)) {
          userMap.set(member.user_id, {
            user_id: member.user_id,
            display_name: '',
            avatar_url: null,
            bio: null,
            mutual_groups: [],
          });
        }
        userMap.get(member.user_id)!.mutual_groups.push({
          id: member.groups.id,
          name: member.groups.name,
        });
      });

      // Fetch profiles
      const userIds = Array.from(userMap.keys());
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, bio')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      profiles?.forEach(profile => {
        const user = userMap.get(profile.user_id);
        if (user) {
          user.display_name = profile.display_name;
          user.avatar_url = profile.avatar_url;
          user.bio = profile.bio;
        }
      });

      return Array.from(userMap.values());
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container max-w-4xl mx-auto py-8">
          <p>Loading...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Discover Connections</h1>
            <p className="text-muted-foreground">Connect with people from your groups</p>
          </div>
        </div>

        {users.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Join groups to discover people with similar interests
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {users.map((person) => (
              <Card key={person.user_id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={person.avatar_url || undefined} />
                        <AvatarFallback>
                          {person.display_name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle>{person.display_name}</CardTitle>
                        {person.bio && (
                          <CardDescription className="mt-1">{person.bio}</CardDescription>
                        )}
                      </div>
                    </div>
                    <ConnectionRequestButton userId={person.user_id} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground">Mutual groups:</span>
                    {person.mutual_groups.slice(0, 3).map((group) => (
                      <Badge key={group.id} variant="secondary">
                        {group.name}
                      </Badge>
                    ))}
                    {person.mutual_groups.length > 3 && (
                      <Badge variant="outline">+{person.mutual_groups.length - 3} more</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default DiscoverConnectionsPage;