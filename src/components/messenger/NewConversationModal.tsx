import { useState } from 'react';
import { Search, User, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMessageConnection } from '@/hooks/useMessageConnection';
import { useQuery } from '@tanstack/react-query';

interface NewConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewConversationModal = ({
  open,
  onOpenChange,
}: NewConversationModalProps) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const { createConversationAndNavigate } = useMessageConnection();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .neq('user_id', user?.id)
        .ilike('display_name', `%${searchQuery}%`)
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!searchQuery.trim() && open,
  });

  const handleSelectUser = async (userId: string) => {
    await createConversationAndNavigate.mutateAsync(userId);
    onOpenChange(false);
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <DialogDescription>
            Search for a user to start a new conversation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Results */}
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <User className="w-12 h-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery.trim() ? 'No users found' : 'Start typing to search for users'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {users.map((profile) => (
                  <Button
                    key={profile.user_id}
                    variant="ghost"
                    className="w-full justify-start gap-3 h-auto py-3"
                    onClick={() => handleSelectUser(profile.user_id)}
                    disabled={createConversationAndNavigate.isPending}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={profile.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {profile.display_name?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{profile.display_name}</span>
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
