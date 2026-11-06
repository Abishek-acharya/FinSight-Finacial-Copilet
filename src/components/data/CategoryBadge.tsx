import { Badge, type BadgeProps } from "@/components/ui/Badge";

export type FinanceCategory = "income" | "housing" | "food" | "transport" | "shopping" | "health" | "other";

const categoryAppearance: Record<FinanceCategory, NonNullable<BadgeProps["variant"]>> = {
  income: "success",
  housing: "default",
  food: "warning",
  transport: "accent",
  shopping: "outline",
  health: "error",
  other: "default",
};

export function CategoryBadge({ category }: { category: FinanceCategory }) {
  const label = category.charAt(0).toUpperCase() + category.slice(1);
  return <Badge variant={categoryAppearance[category]}>{label}</Badge>;
}