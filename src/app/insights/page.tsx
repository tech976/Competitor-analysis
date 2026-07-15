"use client";

import useSWR from "swr";
import { Lightbulb, TrendingUp, AlertTriangle, Wrench, Trophy, Clock } from "lucide-react";
import { FadeIn } from "@/components/ui/motion";
import { GradientText } from "@/components/ui/GradientText";
import { cn } from "@/lib/cn";

interface Insights {
  stats: {
    winnerCount: number;
    formats: { format: string; count: number }[];
    avgDaysLive: number;
    topBehind: { label: string; count: number }[];
  };
  ai: { headline: string; patterns: string[]; gaps: string[]; recommendations: string[] } | null;
}

export default function InsightsPage() {
  const { data, isLoading } = useSWR<Insights>("/api/insights");

  return (
    <div className="mx-auto max-w-5xl">
      <FadeIn className="mb-6">
        <h1 className="inline-flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <Lightbulb className="h-7 w-7 text-accent-soft" />
          <GradientText>Insights</GradientText>
        </h1>
        <p className="mt-1 text-sm text-muted">
          What&apos;s winning across all your scans — and where clients most often fall behind.
        </p>
      </FadeIn>

      {isLoading ? (
        <div className="glass grid place-items-center py-20 text-sm text-muted">
          Mining patterns across your scans…
        </div>
      ) : !data || data.stats.winnerCount === 0 ? (
        <p className="glass px-6 py-16 text-center text-sm text-muted">
          Not enough data yet — run scans on a few clients and the patterns will appear here.
        </p>
      ) : (
        <div className="space-y-6">
          {/* headline + stats */}
          {data.ai?.headline && (
            <FadeIn className="glass p-5">
              <span className="label text-accent-soft">Key takeaway</span>
              <p className="mt-1.5 text-lg font-medium leading-snug">{data.ai.headline}</p>
            </FadeIn>
          )}

          <FadeIn delay={0.05} className="grid gap-3 sm:grid-cols-3">
            <Stat icon={<Trophy className="h-4 w-4 text-amber-300" />} n={data.stats.winnerCount} label="winning ads analysed" />
            <Stat icon={<Clock className="h-4 w-4 text-accent-soft" />} n={data.stats.avgDaysLive} label="avg days a winner runs" />
            <div className="glass-2 p-4">
              <span className="label">Winning formats</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {data.stats.formats.map((f) => (
                  <span key={f.format} className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs">
                    {f.format.toLowerCase()} · {f.count}
                  </span>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* AI panels */}
          {data.ai && (
            <div className="grid gap-4 lg:grid-cols-3">
              <Panel title="Winning patterns" Icon={TrendingUp} tone="accent" items={data.ai.patterns} />
              <Panel title="Where clients lag" Icon={AlertTriangle} tone="behind" items={data.ai.gaps} />
              <Panel title="Do-now moves" Icon={Wrench} tone="lead" items={data.ai.recommendations} numbered />
            </div>
          )}

          {/* most-behind aspects */}
          {data.stats.topBehind.length > 0 && (
            <FadeIn className="glass p-5">
              <h3 className="mb-3 text-sm font-semibold">Aspects clients lose on most</h3>
              <div className="space-y-2">
                {data.stats.topBehind.map((t) => {
                  const max = data.stats.topBehind[0].count || 1;
                  return (
                    <div key={t.label} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 text-xs text-fg/80">{t.label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-canvas">
                        <div className="h-full rounded-full bg-behind" style={{ width: `${(t.count / max) * 100}%` }} />
                      </div>
                      <span className="w-8 text-right text-xs tabular-nums text-muted">{t.count}×</span>
                    </div>
                  );
                })}
              </div>
            </FadeIn>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ icon, n, label }: { icon: React.ReactNode; n: number; label: string }) {
  return (
    <div className="glass-2 p-4">
      <div className="mb-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface">{icon}</div>
      <div className="text-2xl font-semibold tabular-nums">{n}</div>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function Panel({
  title,
  Icon,
  tone,
  items,
  numbered,
}: {
  title: string;
  Icon: typeof TrendingUp;
  tone: "accent" | "behind" | "lead";
  items: string[];
  numbered?: boolean;
}) {
  const toneCls = { accent: "text-accent-soft", behind: "text-behind", lead: "text-lead" }[tone];
  return (
    <div className="glass p-5">
      <h3 className={cn("mb-3 inline-flex items-center gap-2 text-sm font-semibold", toneCls)}>
        <Icon className="h-4 w-4" /> {title}
      </h3>
      {!items?.length ? (
        <p className="text-xs text-muted">—</p>
      ) : (
        <ol className={cn("space-y-1.5 text-sm text-fg/80", numbered ? "list-decimal pl-5" : "list-none")}>
          {items.map((it, i) => (
            <li key={i} className={numbered ? "" : "flex gap-2"}>
              {!numbered && <span className={toneCls}>•</span>}
              <span>{it}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
