import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Conversation } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface ConversationListItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

export const ConversationListItem = ({
  conversation,
  isSelected,
  onClick,
}: ConversationListItemProps) => {
  const { user } = useAuth();

  // Get conversation display info
  const getConversationInfo = () => {
    if (conversation.is_group) {
      return {
        name: conversation.name || 'Group Chat',
        avatar: null,
      };
    }

    // For direct messages, show the other participant
    const otherParticipant = conversation.participants.find(
      (p) => p.user_id !== user?.id
    );

    return {
      name: otherParticipant?.display_name || 'Unknown',
      avatar: otherParticipant?.avatar_url || null,
    };
  };

  const { name, avatar } = getConversationInfo();

  // Get last message preview
  const getLastMessagePreview = () => {
    if (!conversation.last_message) return 'No messages yet';
    
    const { content, sender_id } = conversation.last_message;
    const isSender = sender_id === user?.id;
    const prefix = isSender ? 'You: ' : '';
    
    return `${prefix}${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`;
  };

  // Format timestamp
  const getTimeDisplay = () => {
    if (!conversation.last_message_at) return '';
    
    try {
      return formatDistanceToNow(new Date(conversation.last_message_at), {
        addSuffix: false,
      })
        .replace('about ', '')
        .replace(' minutes', 'm')
        .replace(' minute', 'm')
        .replace(' hours', 'h')
        .replace(' hour', 'h')
        .replace(' days', 'd')
        .replace(' day', 'd');
    } catch {
      return '';
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-4 py-3 flex items-start gap-3 hover:bg-accent/50 transition-colors',
        isSelected && 'bg-accent'
      )}
    >
      {/* Avatar */}
      <Avatar className="w-12 h-12 flex-shrink-0">
        <AvatarImage src={avatar || ''} />
        <AvatarFallback className="bg-primary/10 text-primary font-medium">
          {name.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="font-medium text-sm truncate">{name}</h3>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {getTimeDisplay()}
          </span>
        </div>
        
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground truncate">
            {getLastMessagePreview()}
          </p>
          
          {conversation.unread_count > 0 && (
            <Badge
              variant="destructive"
              className="rounded-full px-2 py-0 text-xs h-5 flex-shrink-0 animate-scale-in"
            >
              {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
};
