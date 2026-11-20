import { Briefcase, HandHelping, Scissors, Shovel, Sprout } from "lucide-react";
import type { CategoryId } from "@/shared/categories";
import { cx } from "./ui";

const ICONS = {
  mowing: Sprout,
  yard: Shovel,
  pruning: Scissors,
  helper: HandHelping,
  other: Briefcase,
} as const;

/** Kiekviena darbų rūšis turi savo spalvą – lengviau atskirti sąrašuose. */
const TINTS: Record<CategoryId, string> = {
  mowing: "bg-brand-100 text-brand-700",
  yard: "bg-sun-100 text-sun-700",
  pruning: "bg-teal-100 text-teal-700",
  helper: "bg-berry-100 text-berry-600",
  other: "bg-stone-100 text-stone-700",
};

export function CategoryIcon({ category, className }: { category: CategoryId | string; className?: string }) {
  const Icon = ICONS[category as CategoryId] ?? Briefcase;
  return <Icon className={className ?? "size-5"} aria-hidden />;
}

/** Spalvotas kvadratėlis su kategorijos ikona. */
export function CategoryBadge({ category, size = "md" }: { category: CategoryId | string; size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "size-14 rounded-2xl" : size === "sm" ? "size-9 rounded-xl" : "size-11 rounded-xl";
  const icon = size === "lg" ? "size-7" : size === "sm" ? "size-5" : "size-6";
  return (
    <span className={cx("flex shrink-0 items-center justify-center", box, TINTS[category as CategoryId] ?? TINTS.other)}>
      <CategoryIcon category={category} className={icon} />
    </span>
  );
}
