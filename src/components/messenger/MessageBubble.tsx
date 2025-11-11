import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Message } from '@/hooks/useConversations';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export const MessageBubble = ({ message, isOwn }: MessageBubbleProps) => {
  const isTemp = message.id.startsWith('temp-');

  const getTimeDisplay = () => {
    try {
      return formatDistanceToNow(new Date(message.created_at), {
        addSuffix: true,
      });
    } catch {
      return '';
    }
  };

  return (
    <div
      className={cn(
        'flex gap-2 items-start animate-fade-in',
        isOwn && 'flex-row-reverse'
      )}
    >
      {!isOwn && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={message.sender?.avatar_url || ''} />
          <AvatarFallback className="bg-muted text-xs">
            {message.sender?.display_name?.substring(0, 2).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          'flex flex-col gap-1 max-w-[70%]',
          isOwn && 'items-end'
        )}
      >
        {!isOwn && (
          <span className="text-xs font-medium text-muted-foreground px-3">
            {message.sender?.display_name || 'Unknown'}
          </span>
        )}

        <div
          className={cn(
            'px-4 py-2 rounded-2xl break-words',
            isOwn
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted text-foreground rounded-bl-sm',
            isTemp && 'opacity-60'
          )}
        >
          {message.attachment_url && (
            <div className="mb-2">
              {message.content_type === 'image' ? (
                <img
                  src={message.attachment_url}
                  alt={message.attachment_name || 'Attachment'}
                  className="max-w-full rounded-lg"
                  loading="lazy"
                />
              ) : (
                <div className="p-2 bg-background/50 rounded flex items-center gap-2">
                  <span className="text-sm truncate">{message.attachment_name}</span>
                </div>
              )}
            </div>
          )}
          
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>

        <span className="text-xs text-muted-foreground px-3">
          {getTimeDisplay()}
          {isTemp && ' • Sending...'}
        </span>
      </div>
    </div>
  );
};
