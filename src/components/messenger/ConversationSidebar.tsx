import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConversationListItem } from './ConversationListItem';
import { Conversation } from '@/hooks/useConversations';
import { NewConversationModal } from './NewConversationModal';

interface ConversationSidebarProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  isLoading: boolean;
}

export const ConversationSidebar = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  isLoading,
}: ConversationSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);

  const filteredConversations = conversations.filter((conv) => {
    const searchLower = searchQuery.toLowerCase();
    const nameMatch = conv.name?.toLowerCase().includes(searchLower);
    const participantMatch = conv.participants.some((p) =>
      p.display_name.toLowerCase().includes(searchLower)
    );
    const messageMatch = conv.last_message?.content.toLowerCase().includes(searchLower);
    return nameMatch || participantMatch || messageMatch;
  });

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Messages</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowNewConversation(true)}
            className="hover:bg-primary/10"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading conversations...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchQuery ? 'No conversations found' : 'No conversations yet'}
            <p className="text-sm mt-2">Start a new conversation to get started</p>
          </div>
        ) : (
          <div className="py-2">
            {filteredConversations.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedConversation?.id === conversation.id}
                onClick={() => onSelectConversation(conversation)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* New Conversation Modal */}
      <NewConversationModal
        open={showNewConversation}
        onOpenChange={setShowNewConversation}
      />
    </div>
  );
};
