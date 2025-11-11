import { MessageSquare } from 'lucide-react';

export const EmptyState = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <MessageSquare className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        Choose a conversation from the sidebar to start messaging, or create a new conversation to connect with someone.
      </p>
    </div>
  );
};
