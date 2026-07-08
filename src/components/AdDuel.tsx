"use client";

import { Trophy, Clock, Zap, AlertTriangle, Wrench } from "lucide-react";
import type { AdLite, DuelResult, DimKey } from "@/lib/api-types";
import { proxied } from "@/lib/client";
import { FadeIn } from "@/components/ui/motion";
import RadarChart from "@/components/ui/RadarChart";
import CountUp from "@/components/ui/CountUp";
import { cn } from "@/lib/cn";

export default function AdDuel({
  result,
  clientAd,
  competitorAd,
}: {
  result: DuelResult;
  clientAd: AdLite;
  competitorAd: AdLite;
}) {
  const a = result.dims.map((d) => result.client.scores[d.key]);
  const b = result.dims.map((d) => result.competitor.scores[d.key]);

  return (
    <div className="space-y-8">
      {/* Side-by-side headline */}
      <FadeIn>
        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-4">
          <AdHeadCard ad={clientAd} overall={result.client.overall} side="You" win={result.overallWinner === "CLIENT"} />
          <div className="flex flex-col items-center justify-center px-1">
            <span className="text-xs text-muted">VS</span>
            <span className="mt-1 grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-xs font-semibold text-accent-soft">
              ⚔
            </span>
          </div>
          <AdHeadCard
            ad={competitorAd}
            overall={result.competitor.overall}
            side="Competitor"
            win={result.overallWinner === "COMPETITOR"}
          />
        </div>
      </FadeIn>

      {result.verdict && (
        <FadeIn delay={0.05}>
          <p className="glass px-5 py-4 text-center text-base font-medium">{result.verdict}</p>
        </FadeIn>
      )}

      {/* Radar + scorecard */}
      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <FadeIn delay={0.1} className="glass grid place-items-center p-4">
          <RadarChart labels={result.dims.map((d) => d.label)} a={a} b={b} />
        </FadeIn>

        <FadeIn delay={0.15} className="glass p-5">
          <h3 className="mb-3 text-sm font-semibold">Scorecard</h3>
          <div className="space-y-2.5">
            {result.dims.map((d) => (
              <ScoreRow
                key={d.key}
                label={d.label}
                you={result.client.scores[d.key]}
                rival={result.competitor.scores[d.key]}
                winner={result.winners[d.key]}
                note={result.notes[d.key as DimKey]}
              />
            ))}
          </div>
        </FadeIn>
      </div>

      {/* Insights */}
      <div className="grid gap-4 lg:grid-cols-3">
        <InsightPanel title="Why they win" Icon={Trophy} tone="behind" items={result.whyCompetitorWins} />
        <InsightPanel title="Where you're losing" Icon={AlertTriangle} tone="behind" items={result.whereClientLosing} />
        <InsightPanel title="Immediate fixes" Icon={Wrench} tone="lead" items={result.immediateFixes} numbered />
      </div>
    </div>
  );
}

function AdHeadCard({
  ad,
  overall,
  side,
  win,
}: {
  ad: AdLite;
  overall: number;
  side: string;
  win: boolean;
}) {
  const img = proxied(ad.imageUrl);
  return (
    <div className={cn("glass overflow-hidden", win && "ring-1 ring-lead/40")}>
      <div className="relative aspect-video bg-canvas">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-xs text-muted">No preview</div>
        )}
        {win && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-lead/20 px-2 py-0.5 text-[10px] font-semibold text-lead">
            <Trophy className="h-3 w-3" /> Winner
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="label">{side}</span>
          <span className="text-xs text-muted">{ad.advertiserName}</span>
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span
            className={cn(
              "text-3xl font-semibold tabular-nums",
              win ? "text-lead" : "text-white/90"
            )}
          >
            <CountUp value={overall} />
          </span>
          <span className="text-sm text-muted">/100</span>
        </div>
        {ad.headline && <p className="mt-1 line-clamp-1 text-sm">{ad.headline}</p>}
        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {ad.daysLiveLatest ?? "—"}d
          </span>
          <span className="inline-flex items-center gap-1">
            <Zap className="h-3 w-3" /> {ad.winningScore != null ? Math.round(ad.winningScore) : "—"}
          </span>
          <span>{ad.mediaType.toLowerCase()}</span>
        </div>
      </div>
    </div>
  );
}

function ScoreRow({
  label,
  you,
  rival,
  winner,
  note,
}: {
  label: string;
  you: number;
  rival: number;
  winner: "CLIENT" | "COMPETITOR" | "TIE";
  note?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="w-28 shrink-0 text-xs text-white/80">{label}</span>
        <Bar value={you} tone="client" />
        <span className="w-9 text-right text-xs tabular-nums text-accent-soft">{you}</span>
        <span className="w-9 text-right text-xs tabular-nums text-fuchsia-300">{rival}</span>
        <Bar value={rival} tone="rival" reverse />
        <span
          className={cn(
            "w-4 text-center text-xs",
            winner === "CLIENT" ? "text-lead" : winner === "COMPETITOR" ? "text-behind" : "text-muted"
          )}
          title={winner === "TIE" ? "Tie" : winner === "CLIENT" ? "You win" : "They win"}
        >
          {winner === "CLIENT" ? "✓" : winner === "COMPETITOR" ? "✗" : "="}
        </span>
      </div>
      {note && <p className="ml-28 mt-0.5 pl-3 text-[11px] text-muted">{note}</p>}
    </div>
  );
}

function Bar({
  value,
  tone,
  reverse,
}: {
  value: number;
  tone: "client" | "rival";
  reverse?: boolean;
}) {
  return (
    <div className={cn("h-1.5 flex-1 overflow-hidden rounded-full bg-canvas", reverse && "rotate-180")}>
      <div
        className={cn("h-full rounded-full", tone === "client" ? "bg-accent" : "bg-fuchsia-400/70")}
        style={{ width: `${(value / 10) * 100}%` }}
      />
    </div>
  );
}

function InsightPanel({
  title,
  Icon,
  tone,
  items,
  numbered,
}: {
  title: string;
  Icon: typeof Trophy;
  tone: "lead" | "behind";
  items: string[];
  numbered?: boolean;
}) {
  return (
    <div className="glass p-5">
      <h3
        className={cn(
          "mb-3 inline-flex items-center gap-2 text-sm font-semibold",
          tone === "lead" ? "text-lead" : "text-behind"
        )}
      >
        <Icon className="h-4 w-4" /> {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted">—</p>
      ) : (
        <ol className={cn("space-y-1.5 text-sm text-white/80", numbered ? "list-decimal pl-5" : "list-none")}>
          {items.map((it, i) => (
            <li key={i} className={numbered ? "" : "flex gap-2"}>
              {!numbered && <span className={tone === "lead" ? "text-lead" : "text-behind"}>•</span>}
              <span>{it}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
