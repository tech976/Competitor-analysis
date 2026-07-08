"use client";

import { motion } from "framer-motion";

/**
 * Lightweight SVG radar/spider chart comparing two series across N axes
 * (values 0-10). No charting dependency.
 */
export default function RadarChart({
  labels,
  a,
  b,
  labelA = "You",
  labelB = "Competitor",
  colorA = "#7c5cff",
  colorB = "#f0abfc",
  size = 340,
  max = 10,
}: {
  labels: string[];
  a: number[];
  b: number[];
  labelA?: string;
  labelB?: string;
  colorA?: string;
  colorB?: string;
  size?: number;
  max?: number;
}) {
  const pad = 54;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - pad;
  const n = labels.length;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  const pt = (i: number, value: number) => {
    const r = (Math.max(0, Math.min(max, value)) / max) * R;
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))] as const;
  };
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, v).join(",")).join(" ");

  const rings = [2, 4, 6, 8, 10];

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size}>
        {/* grid rings */}
        {rings.map((lvl) => (
          <polygon
            key={lvl}
            points={labels.map((_, i) => pt(i, lvl).join(",")).join(" ")}
            fill="none"
            stroke="#23232f"
            strokeWidth={1}
          />
        ))}
        {/* axes + labels */}
        {labels.map((label, i) => {
          const [x, y] = pt(i, max);
          const [lx, ly] = (() => {
            const r = R + 22;
            return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
          })();
          const anchor = Math.abs(Math.cos(angle(i))) < 0.3 ? "middle" : Math.cos(angle(i)) > 0 ? "start" : "end";
          return (
            <g key={label}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke="#23232f" strokeWidth={1} />
              <text
                x={lx}
                y={ly}
                fill="#8b8b9a"
                fontSize={11}
                textAnchor={anchor}
                dominantBaseline="middle"
              >
                {label}
              </text>
            </g>
          );
        })}
        {/* competitor polygon (drawn first / behind) */}
        <motion.polygon
          points={poly(b)}
          fill={colorB}
          fillOpacity={0.14}
          stroke={colorB}
          strokeWidth={2}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: "center" }}
        />
        {/* client polygon */}
        <motion.polygon
          points={poly(a)}
          fill={colorA}
          fillOpacity={0.22}
          stroke={colorA}
          strokeWidth={2}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: "center" }}
        />
      </svg>
      <div className="mt-1 flex items-center gap-5 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colorA }} /> {labelA}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colorB }} /> {labelB}
        </span>
      </div>
    </div>
  );
}
