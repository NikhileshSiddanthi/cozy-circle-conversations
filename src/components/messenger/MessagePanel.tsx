import { ArrowLeft, Search, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Conversation } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages } from '@/hooks/useMessages';
import { MessageInput } from './MessageInput';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useEffect, useRef } from 'react';

interface MessagePanelProps {
  conversation: Conversation;
  onBack: () => void;
}

export const MessagePanel = ({ conversation, onBack }: MessagePanelProps) => {
  const { user } = useAuth();
  const { messages, isLoading, sendMessage } = useMessages(conversation.id);
  const { startTyping, stopTyping, getTypingUsers } = useTypingIndicator(conversation.id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get conversation display info
  const getConversationInfo = () => {
    if (conversation.is_group) {
      return {
        name: conversation.name || 'Group Chat',
        avatar: null,
        subtitle: `${conversation.participants.length} members`,
      };
    }

    const otherParticipant = conversation.participants.find(
      (p) => p.user_id !== user?.id
    );

    return {
      name: otherParticipant?.display_name || 'Unknown',
      avatar: otherParticipant?.avatar_url || null,
      subtitle: 'Active now', // TODO: Add actual online status
    };
  };

  const { name, avatar, subtitle } = getConversationInfo();
  const typingUsers = getTypingUsers();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="md:hidden"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <Avatar className="w-10 h-10">
          <AvatarImage src={avatar || ''} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate">{name}</h2>
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        </div>

        <Button variant="ghost" size="icon" className="flex-shrink-0">
          <Search className="w-5 h-5" />
        </Button>

        <Button variant="ghost" size="icon" className="flex-shrink-0">
          <Info className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.sender_id === user?.id}
              />
            ))}
            
            {typingUsers.length > 0 && (
              <TypingIndicator users={typingUsers} />
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border bg-card">
        <MessageInput
          onSend={async (data) => {
            await sendMessage.mutateAsync(data);
          }}
          onTyping={startTyping}
          onStopTyping={stopTyping}
          isSending={sendMessage.isPending}
        />
      </div>
    </div>
  );
};
