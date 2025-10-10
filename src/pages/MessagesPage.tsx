import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const MessagesPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { conversations, isLoading: loadingConversations } = useConversations();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  
  const { messages, isLoading: loadingMessages, sendMessage } = useMessages(selectedConversation);

  // Handle pre-selected conversation from navigation state
  useEffect(() => {
    if (location.state?.selectedConversation) {
      setSelectedConversation(location.state.selectedConversation);
    }
  }, [location.state]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    await sendMessage.mutateAsync({ content: messageText });
    setMessageText('');
  };

  const getConversationName = (conv: any) => {
    if (conv.is_group) return conv.name || 'Group Chat';
    const otherUser = conv.participants.find((p: any) => p.user_id !== user?.id);
    return otherUser?.display_name || 'Unknown User';
  };

  const getConversationAvatar = (conv: any) => {
    if (conv.is_group) return null;
    const otherUser = conv.participants.find((p: any) => p.user_id !== user?.id);
    return otherUser?.avatar_url;
  };

  if (loadingConversations) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading conversations...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-6xl py-8">
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Messages</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
          {/* Conversations List */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-350px)]">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center text-sm">
                      No conversations yet. Start connecting with others!
                    </p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv.id)}
                      className={`w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors ${
                        selectedConversation === conv.id ? 'bg-accent' : ''
                      }`}
                    >
                      <Avatar>
                        <AvatarImage src={getConversationAvatar(conv) || ''} />
                        <AvatarFallback>
                          {getConversationName(conv)[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-sm">{getConversationName(conv)}</p>
                        {conv.last_message_at && (
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="md:col-span-2">
            {selectedConversation ? (
              <>
                <CardHeader>
                  <CardTitle>
                    {conversations.find((c) => c.id === selectedConversation) &&
                      getConversationName(
                        conversations.find((c) => c.id === selectedConversation)
                      )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col h-[calc(100vh-450px)]">
                  <ScrollArea className="flex-1 pr-4 mb-4">
                    {loadingMessages ? (
                      <p className="text-center text-muted-foreground">Loading messages...</p>
                    ) : messages.length === 0 ? (
                      <p className="text-center text-muted-foreground">No messages yet</p>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((msg) => {
                          const isOwn = msg.sender_id === user?.id;
                          return (
                            <div
                              key={msg.id}
                              className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                            >
                              {!isOwn && (
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={msg.sender?.avatar_url || ''} />
                                  <AvatarFallback>
                                    {msg.sender?.display_name?.[0] || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div
                                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                                  isOwn
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <p className="text-sm">{msg.content}</p>
                                <p
                                  className={`text-xs mt-1 ${
                                    isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                  }`}
                                >
                                  {formatDistanceToNow(new Date(msg.created_at), {
                                    addSuffix: true,
                                  })}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <Button type="submit" size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Select a conversation to start messaging
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default MessagesPage;
