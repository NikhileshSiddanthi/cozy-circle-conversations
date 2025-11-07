import { useState } from 'react';
import { ConversationSidebar } from './ConversationSidebar';
import { MessagePanel } from './MessagePanel';
import { Conversation } from '@/hooks/useConversations';
import { useConversations } from '@/hooks/useConversations';
import { EmptyState } from './EmptyState';

export const MessengerLayout = () => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const { conversations, isLoading } = useConversations();

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowMobilePanel(true);
  };

  const handleBack = () => {
    setShowMobilePanel(false);
    setSelectedConversation(null);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Conversations List */}
      <div className={`
        w-full md:w-[400px] lg:w-[420px] border-r border-border
        ${showMobilePanel ? 'hidden md:block' : 'block'}
      `}>
        <ConversationSidebar
          conversations={conversations}
          selectedConversation={selectedConversation}
          onSelectConversation={handleSelectConversation}
          isLoading={isLoading}
        />
      </div>

      {/* Right Panel - Messages */}
      <div className={`
        flex-1
        ${!showMobilePanel ? 'hidden md:flex' : 'flex'}
      `}>
        {selectedConversation ? (
          <MessagePanel
            conversation={selectedConversation}
            onBack={handleBack}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
};
