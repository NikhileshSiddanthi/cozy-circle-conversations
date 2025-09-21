import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, CheckCircle, XCircle, CheckCircle2, Clock, Eye } from 'lucide-react';
import { AdminEmptyState } from './AdminEmptyState';
import { ConfirmationModal } from './ConfirmationModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';

interface Group {
  id: string;
  name: string;
  description: string;
  category_id: string | null;
  type: string;
  is_public: boolean;
  is_approved: boolean;
  creator_id: string;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
}

interface GroupManagementTabProps {
  pendingGroups: Group[];
  categories: Category[];
  onApproveGroup: (groupId: string, categoryId: string) => void;
  onRejectGroup: (groupId: string) => void;
}

export const GroupManagementTab: React.FC<GroupManagementTabProps> = ({
  pendingGroups,
  categories,
  onApproveGroup,
  onRejectGroup
}) => {
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: 'approve' | 'reject';
    groupId: string;
    groupName?: string;
  }>({ open: false, type: 'approve', groupId: '' });

  const [approvalModal, setApprovalModal] = useState<{
    open: boolean;
    groupId: string;
    groupName: string;
    selectedCategoryId: string;
  }>({ open: false, groupId: '', groupName: '', selectedCategoryId: '' });

  const handleConfirm = () => {
    if (confirmModal.type === 'reject') {
      onRejectGroup(confirmModal.groupId);
    }
    setConfirmModal({ open: false, type: 'approve', groupId: '' });
  };

  const handleApproval = () => {
    if (approvalModal.selectedCategoryId) {
      onApproveGroup(approvalModal.groupId, approvalModal.selectedCategoryId);
      setApprovalModal({ open: false, groupId: '', groupName: '', selectedCategoryId: '' });
    }
  };

  if (pendingGroups.length === 0) {
    return (
      <AdminEmptyState
        icon={CheckCircle2}
        title="All caught up!"
        description="No pending group suggestions at the moment. You'll see new group proposals here when users suggest them."
      />
    );
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'topic': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'personality': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'institutional': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Group Suggestions
            <Badge variant="secondary" className="ml-auto">
              {pendingGroups.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingGroups.map((group) => (
            <div key={group.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  {/* Group Name and Type */}
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-base">{group.name}</h3>
                    <Badge className={getTypeColor(group.type)}>
                      {group.type}
                    </Badge>
                    <Badge variant={group.is_public ? 'outline' : 'secondary'} className="text-xs">
                      <Eye className="h-3 w-3 mr-1" />
                      {group.is_public ? 'Public' : 'Private'}
                    </Badge>
                  </div>

                  {/* Description */}
                  {group.description && (
                    <p className="text-sm text-muted-foreground">
                      {group.description.length > 100 
                        ? `${group.description.substring(0, 100)}...` 
                        : group.description}
                    </p>
                  )}

                  {/* Meta Info */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Suggested: {formatDistanceToNow(new Date(group.created_at), { addSuffix: true })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        Creator: {group.creator_id.slice(0, 8)}...
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 ml-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => setApprovalModal({
                            open: true,
                            groupId: group.id,
                            groupName: group.name,
                            selectedCategoryId: group.category_id || ''
                          })}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Approve group suggestion</TooltipContent>
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
                            groupId: group.id,
                            groupName: group.name
                          })}
                          className="text-destructive hover:text-destructive border-destructive/20"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Reject group suggestion</TooltipContent>
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
        title={confirmModal.type === 'reject' ? 'Reject Group Suggestion' : ''}
        description={confirmModal.type === 'reject' 
          ? `Are you sure you want to reject the group "${confirmModal.groupName}"? This action cannot be undone and will permanently remove the suggestion.`
          : ''
        }
        confirmLabel={'Reject Group'}
        variant={'destructive'}
        onConfirm={handleConfirm}
      />

      <Dialog open={approvalModal.open} onOpenChange={(open) => setApprovalModal(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Group: {approvalModal.groupName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Assign Category</label>
              <Select
                value={approvalModal.selectedCategoryId}
                onValueChange={(value) => setApprovalModal(prev => ({ ...prev, selectedCategoryId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category for this group" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setApprovalModal({ open: false, groupId: '', groupName: '', selectedCategoryId: '' })}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleApproval}
                disabled={!approvalModal.selectedCategoryId}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Approve Group
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};