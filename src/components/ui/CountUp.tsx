"use client";

import { useEffect, useState } from "react";
import { animate } from "framer-motion";

/** Animate a number from 0 → value on mount (ReactBits CountUp style). */
export default function CountUp({
  value,
  duration = 1.1,
  decimals = 0,
  className,
}: {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, duration]);

  return <span className={className}>{display.toFixed(decimals)}</span>;
}
