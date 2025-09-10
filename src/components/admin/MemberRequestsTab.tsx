import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle, XCircle, CheckCircle2 } from 'lucide-react';
import { AdminEmptyState } from './AdminEmptyState';
import { ConfirmationModal } from './ConfirmationModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';

interface PendingMember {
  id: string;
  user_id: string;
  group_id: string;
  status: string;
  joined_at: string;
  groups: {
    name: string;
  };
}

interface MemberRequestsTabProps {
  pendingMembers: PendingMember[];
  onApproveMember: (memberId: string) => void;
  onRejectMember: (memberId: string) => void;
}

export const MemberRequestsTab: React.FC<MemberRequestsTabProps> = ({
  pendingMembers,
  onApproveMember,
  onRejectMember
}) => {
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: 'approve' | 'reject';
    memberId: string;
    memberInfo?: string;
  }>({ open: false, type: 'approve', memberId: '' });

  const handleConfirm = () => {
    if (confirmModal.type === 'approve') {
      onApproveMember(confirmModal.memberId);
    } else {
      onRejectMember(confirmModal.memberId);
    }
    setConfirmModal({ open: false, type: 'approve', memberId: '' });
  };

  if (pendingMembers.length === 0) {
    return (
      <AdminEmptyState
        icon={CheckCircle2}
        title="All caught up!"
        description="No pending member requests at the moment. You'll see new membership requests here when users apply to join groups."
      />
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Member Requests
            <Badge variant="secondary" className="ml-auto">
              {pendingMembers.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingMembers.map((member) => (
            <div key={member.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      User ID: {member.user_id.slice(0, 8)}...
                    </Badge>
                  </div>
                  <p className="font-medium text-sm">
                    Wants to join: {member.groups?.name || 'Unknown Group'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Requested: {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => setConfirmModal({
                            open: true,
                            type: 'approve',
                            memberId: member.id,
                            memberInfo: member.groups?.name
                          })}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Approve member request</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmModal({
                            open: true,
                            type: 'reject',
                            memberId: member.id,
                            memberInfo: member.groups?.name
                          })}
                          className="text-destructive hover:text-destructive border-destructive/20"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Reject member request</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <ConfirmationModal
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal(prev => ({ ...prev, open }))}
        title={confirmModal.type === 'approve' ? 'Approve Member Request' : 'Reject Member Request'}
        description={confirmModal.type === 'approve' 
          ? `Are you sure you want to approve this member request for "${confirmModal.memberInfo}"?`
          : `Are you sure you want to reject this member request for "${confirmModal.memberInfo}"? This action cannot be undone.`
        }
        confirmLabel={confirmModal.type === 'approve' ? 'Approve' : 'Reject'}
        variant={confirmModal.type === 'reject' ? 'destructive' : 'default'}
        onConfirm={handleConfirm}
      />
    </>
  );
};