import { Briefcase, HandHelping, Scissors, Shovel, Sprout } from "lucide-react";
import type { CategoryId } from "@/shared/categories";

const ICONS = {
  mowing: Sprout,
  yard: Shovel,
  pruning: Scissors,
  helper: HandHelping,
  other: Briefcase,
} as const;

export function CategoryIcon({ category, className }: { category: CategoryId | string; className?: string }) {
  const Icon = ICONS[category as CategoryId] ?? Briefcase;
  return <Icon className={className ?? "size-5"} aria-hidden />;
}
