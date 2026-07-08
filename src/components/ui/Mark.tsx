import { ArrowUpRight, Minus, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/cn";

export type MarkValue = "LEAD" | "PAR" | "BEHIND";

const MAP: Record<
  MarkValue,
  { label: string; cls: string; Icon: typeof Minus }
> = {
  LEAD: { label: "You lead", cls: "text-lead border-lead/30 bg-lead/10", Icon: ArrowUpRight },
  PAR: { label: "On par", cls: "text-par border-par/30 bg-par/10", Icon: Minus },
  BEHIND: {
    label: "You're behind",
    cls: "text-behind border-behind/30 bg-behind/10",
    Icon: ArrowDownRight,
  },
};

/** Comparison verdict pill: ✅ lead / ➖ par / ❌ behind. */
export default function Mark({
  value,
  className,
}: {
  value: MarkValue;
  className?: string;
}) {
  const { label, cls, Icon } = MAP[value];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        cls,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
