import { Badge, type BadgeProps } from "@/components/ui/Badge";

export type TransactionStatus = "completed" | "pending" | "failed" | "cancelled";

const statusAppearance: Record<TransactionStatus, NonNullable<BadgeProps["variant"]>> = {
  completed: "success",
  pending: "warning",
  failed: "error",
  cancelled: "outline",
};

export function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <Badge variant={statusAppearance[status]}>{label}</Badge>;
}