import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-lg bg-white text-center shadow-sm">
      <Icon className="h-10 w-10 text-muted-foreground mb-4 stroke-[1.5]" />
      <p className="text-sm font-medium text-muted-foreground mb-5">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
