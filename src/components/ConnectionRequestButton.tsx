import React from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Check, Clock, X } from 'lucide-react';
import { useConnections } from '@/hooks/useConnections';
import { useAuth } from '@/contexts/AuthContext';

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
      <Button
        variant={variant}
        size={size}
        onClick={() => sendRequest.mutate(userId)}
        disabled={sendRequest.isPending}
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Connect
      </Button>
    );
  }

  if (existingConnection.status === 'accepted') {
    return (
      <Button variant="outline" size={size} disabled>
        <Check className="h-4 w-4 mr-2" />
        Connected
      </Button>
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
      <div className="flex gap-2">
        <Button
          variant="default"
          size={size}
          onClick={() => updateConnection.mutate({ 
            id: existingConnection.id, 
            status: 'accepted' 
          })}
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
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return null;
};
