import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Static violet→fuchsia gradient text. */
export function GradientText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "bg-gradient-to-r from-accent-soft via-fuchsia-300 to-accent bg-clip-text text-transparent",
        className
      )}
    >
      {children}
    </span>
  );
}

/** Sheen sweeping across the text (ReactBits ShinyText vibe). */
export function ShinyText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "animate-shimmer bg-clip-text text-transparent [background-size:200%_100%]",
        "[background-image:linear-gradient(110deg,#8b8b9a,40%,#fff,60%,#8b8b9a)]",
        className
      )}
    >
      {children}
    </span>
  );
}
