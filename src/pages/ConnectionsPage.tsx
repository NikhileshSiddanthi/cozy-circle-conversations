import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useConnections } from '@/hooks/useConnections';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Users, Clock, Check, X, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessageConnection } from '@/hooks/useMessageConnection';

const ConnectionsPage = () => {
  const { user } = useAuth();
  const { connections, acceptedConnections, pendingRequests, isLoading, updateConnection } = useConnections();
  const { createConversationAndNavigate } = useMessageConnection();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading connections...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-4xl py-8">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">My Connections</h1>
        </div>

        <Tabs defaultValue="connections" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="connections">
              <Users className="h-4 w-4 mr-2" />
              Connections ({acceptedConnections.length})
            </TabsTrigger>
            <TabsTrigger value="requests">
              <Clock className="h-4 w-4 mr-2" />
              Requests ({pendingRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="space-y-4 mt-6">
            {acceptedConnections.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    No connections yet. Start connecting with others!
                  </p>
                </CardContent>
              </Card>
            ) : (
              acceptedConnections.map((connection) => {
                const isRequester = connection.requester_id === user?.id;
                const otherUser = isRequester ? connection.recipient : connection.requester;

                return (
                  <Card key={connection.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={otherUser?.avatar_url || ''} />
                          <AvatarFallback>
                            {otherUser?.display_name?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{otherUser?.display_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Connected {new Date(connection.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const otherUserId = isRequester ? connection.recipient_id : connection.requester_id;
                          createConversationAndNavigate.mutate(otherUserId);
                        }}
                        disabled={createConversationAndNavigate.isPending}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4 mt-6">
            {pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    No pending connection requests
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.requester?.avatar_url || ''} />
                          <AvatarFallback>
                            {request.requester?.display_name?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold">{request.requester?.display_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Sent {new Date(request.created_at).toLocaleDateString()}
                          </p>
                          {request.message && (
                            <p className="mt-2 text-sm border-l-2 border-primary pl-3 py-1">
                              {request.message}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => updateConnection.mutate({ 
                            id: request.id, 
                            status: 'accepted' 
                          })}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateConnection.mutate({ 
                            id: request.id, 
                            status: 'rejected' 
                          })}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default ConnectionsPage;
