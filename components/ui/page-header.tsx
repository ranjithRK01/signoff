import React from 'react';

interface PageHeaderProps {
  title: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-6 mb-6 border-b border-border">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  );
}
