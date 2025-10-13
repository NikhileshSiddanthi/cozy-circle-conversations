import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { UserPlus, Check, Clock, X, MessageSquare } from 'lucide-react';
import { useConnections } from '@/hooks/useConnections';
import { useAuth } from '@/contexts/AuthContext';
import { useMessageConnection } from '@/hooks/useMessageConnection';

interface ConnectionRequestButtonProps {
  userId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const ConnectionRequestButton: React.FC<ConnectionRequestButtonProps> = ({
  userId,
  variant = 'default',
  size = 'default',
}) => {
  const { user } = useAuth();
  const { connections, sendRequest, updateConnection } = useConnections();
  const { createConversationAndNavigate } = useMessageConnection();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  // Don't show button for own profile
  if (user?.id === userId) return null;

  // Find existing connection
  const existingConnection = connections.find(
    (c) =>
      (c.requester_id === user?.id && c.recipient_id === userId) ||
      (c.recipient_id === user?.id && c.requester_id === userId)
  );

  if (!existingConnection) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant={variant} size={size}>
            <UserPlus className="h-4 w-4 mr-2" />
            Connect
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Connection Request</DialogTitle>
            <DialogDescription>
              Add a message to introduce yourself (optional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Hi! I'd like to connect with you..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
                rows={4}
              />
              <p className="text-sm text-muted-foreground">{message.length}/500</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setMessage('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                sendRequest.mutate(
                  { recipientId: userId, message: message.trim() || undefined },
                  {
                    onSuccess: () => {
                      setIsOpen(false);
                      setMessage('');
                    },
                  }
                );
              }}
              disabled={sendRequest.isPending}
            >
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (existingConnection.status === 'accepted') {
    return (
      <div className="flex flex-col sm:flex-row gap-2">
        <Button variant="outline" size={size} disabled className="w-full sm:w-auto">
          <Check className="h-4 w-4 mr-2" />
          Connected
        </Button>
        <Button 
          variant="default" 
          size={size}
          onClick={() => createConversationAndNavigate.mutate(userId)}
          className="w-full sm:w-auto"
          disabled={createConversationAndNavigate.isPending}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Message
        </Button>
      </div>
    );
  }

  if (existingConnection.status === 'pending') {
    // If current user sent the request
    if (existingConnection.requester_id === user?.id) {
      return (
        <Button
          variant="outline"
          size={size}
          onClick={() => updateConnection.mutate({ 
            id: existingConnection.id, 
            status: 'rejected' 
          })}
        >
          <Clock className="h-4 w-4 mr-2" />
          Pending
        </Button>
      );
    }

    // If current user received the request
    return (
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="default"
          size={size}
          onClick={() => updateConnection.mutate({ 
            id: existingConnection.id, 
            status: 'accepted' 
          })}
          className="w-full sm:w-auto"
          disabled={updateConnection.isPending}
        >
          <Check className="h-4 w-4 mr-2" />
          Accept
        </Button>
        <Button
          variant="outline"
          size={size}
          onClick={() => updateConnection.mutate({ 
            id: existingConnection.id, 
            status: 'rejected' 
          })}
          className="w-full sm:w-auto"
          disabled={updateConnection.isPending}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return null;
};