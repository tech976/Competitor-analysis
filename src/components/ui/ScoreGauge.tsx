"use client";

import { motion } from "framer-motion";
import CountUp from "./CountUp";
import { cn } from "@/lib/cn";

/**
 * Animated circular gauge. Used for the headline Gap/Opportunity Score and for
 * competitor 1–10 ratings (pass max={10}).
 */
export default function ScoreGauge({
  value,
  max = 100,
  size = 132,
  label,
  className,
}: {
  value: number;
  max?: number;
  size?: number;
  label?: string;
  className?: string;
}) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = Math.max(0, Math.min(1, value / max));
  const color = ratio >= 0.66 ? "#34d399" : ratio >= 0.33 ? "#fbbf24" : "#fb7185";

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#23232f"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - ratio) }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-semibold tabular-nums" style={{ color }}>
          <CountUp value={value} />
          {max === 10 && <span className="text-base text-muted">/10</span>}
        </span>
        {label && <span className="label mt-0.5">{label}</span>}
      </div>
    </div>
  );
}
