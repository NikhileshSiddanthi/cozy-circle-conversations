import React from 'react';
import { LucideIcon } from 'lucide-react';

interface AdminEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const AdminEmptyState: React.FC<AdminEmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action
}) => {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
        <Icon className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4 max-w-sm mx-auto">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};