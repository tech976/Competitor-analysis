"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A card with a cursor-following spotlight glow (ReactBits-style). Cheap: just
 * updates two CSS variables on mousemove.
 */
export default function SpotlightCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={cn(
        "group relative overflow-hidden glass transition-colors",
        "before:pointer-events-none before:absolute before:inset-0 before:opacity-0",
        "before:transition-opacity before:duration-300 hover:before:opacity-100",
        "before:[background:radial-gradient(360px_circle_at_var(--mx)_var(--my),rgba(124,92,255,0.14),transparent_60%)]",
        className
      )}
    >
      {children}
    </div>
  );
}
