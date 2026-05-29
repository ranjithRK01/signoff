import { Badge } from "@/components/ui/badge";

export type ProjectStatus = 'pending' | 'approved' | 'revision';

interface StatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  let label = "Pending";
  let variantClass = "bg-warning hover:bg-warning/90 text-white font-medium";

  if (status === 'approved') {
    label = "Approved";
    variantClass = "bg-success hover:bg-success/90 text-white font-medium";
  } else if (status === 'revision') {
    label = "Revision";
    variantClass = "bg-danger hover:bg-danger/90 text-white font-medium";
  }

  return (
    <Badge className={`${variantClass} border-none rounded-md px-2.5 py-0.5 text-xs ${className || ""}`}>
      {label}
    </Badge>
  );
}
