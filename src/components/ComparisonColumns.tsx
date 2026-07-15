"use client";

import {
  Zap,
  Tag,
  Palette,
  Type,
  Mic,
  Star,
  MousePointerClick,
  Heart,
  BadgeCheck,
  Play,
  Clock,
  ExternalLink,
} from "lucide-react";
import type { AdLite, ColumnsResult } from "@/lib/api-types";
import { proxied } from "@/lib/client";
import { cn } from "@/lib/cn";

const ASPECT_ICON: Record<string, typeof Zap> = {
  hook: Zap,
  offerClarity: Tag,
  visualAppeal: Palette,
  onScreenText: Type,
  scriptVoiceover: Mic,
  socialProof: Star,
  ctaEffectiveness: MousePointerClick,
  emotionalAppeal: Heart,
  branding: BadgeCheck,
};

function scoreTone(n: number) {
  if (n >= 8) return "bg-lead/15 text-lead";
  if (n >= 6) return "bg-par/15 text-par";
  return "bg-behind/15 text-behind";
}

function overallTone(n: number) {
  if (n >= 80) return "text-lead";
  if (n >= 65) return "text-par";
  if (n >= 50) return "text-amber-300";
  return "text-behind";
}

export default function ComparisonColumns({
  result,
  adsById,
}: {
  result: ColumnsResult;
  adsById: Record<string, AdLite>;
}) {
  const { aspects, columns } = result;
  const cols = `220px repeat(${columns.length}, minmax(190px, 1fr))`;

  return (
    <div className="glass overflow-x-auto p-4">
      <div className="grid min-w-[680px] gap-y-px" style={{ gridTemplateColumns: cols }}>
        {/* Header row */}
        <div className="flex items-end px-3 pb-3">
          <span className="label">Comparison Aspects</span>
        </div>
        {columns.map((col, i) => {
          const ad = adsById[col.adId];
          const isVideo = ad && (ad.mediaType === "VIDEO" || ad.mediaType === "REEL");
          const img = proxied(ad?.imageUrl);
          return (
            <div
              key={col.adId}
              className={cn(
                "rounded-t-xl px-3 pb-3 pt-3",
                col.isClient ? "bg-accent/[0.07]" : "bg-surface-2/30"
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">
                  {col.isClient ? "Your Ad" : `Competitor ${i}`}
                </span>
                {col.isClient ? (
                  <span className="rounded-full bg-lead/15 px-2 py-0.5 text-[10px] font-medium text-lead">
                    Your Brand
                  </span>
                ) : (
                  <BadgeCheck className="h-4 w-4 text-accent-soft" />
                )}
              </div>
              <p className="mb-2 truncate text-xs text-muted" title={ad?.advertiserPageName ?? col.advertiserName}>
                {ad?.advertiserPageName ?? col.advertiserName}
              </p>
              <div className="relative aspect-video overflow-hidden rounded-lg bg-canvas">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-[11px] text-muted">
                    No preview
                  </div>
                )}
                {isVideo && (
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-black/55">
                      <Play className="h-4 w-4 fill-fg text-fg" />
                    </span>
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
                <Clock className="h-3 w-3" />
                Active {ad?.daysLiveLatest ?? "—"}d
                {ad?.winningScore != null && (
                  <span className="ml-auto rounded bg-surface px-1.5 py-0.5 text-[10px]">
                    WS {Math.round(ad.winningScore)}
                  </span>
                )}
              </div>
              {ad?.adLibraryUrl && (
                <a
                  href={ad.adLibraryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-accent-soft hover:underline"
                >
                  View on Ad Library <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          );
        })}

        {/* Aspect rows */}
        {aspects.map((asp) => {
          const Icon = ASPECT_ICON[asp.key] ?? Zap;
          const best = Math.max(
            ...columns.map((c) => {
              const s = c.scores[asp.key];
              return s?.na ? -1 : s?.score ?? 0;
            })
          );
          return (
            <Row key={asp.key}>
              <div className="flex items-start gap-2.5 px-3 py-3">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-accent-soft">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium leading-tight">{asp.label}</p>
                  <p className="text-[11px] text-muted">{asp.desc}</p>
                </div>
              </div>
              {columns.map((col) => {
                const cell = col.scores[asp.key];
                const sc = cell?.score ?? 0;
                const na = cell?.na;
                return (
                  <div
                    key={col.adId}
                    className={cn("px-3 py-3", col.isClient && "bg-accent/[0.04]")}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={cn(
                          "grid h-6 w-6 shrink-0 place-items-center rounded-md text-xs font-semibold",
                          na
                            ? "bg-surface-2 text-muted"
                            : cn(scoreTone(sc), sc === best && best > 0 && "ring-1 ring-current")
                        )}
                        title={na ? "Not applicable to this format" : undefined}
                      >
                        {na ? "—" : sc}
                      </span>
                      {cell?.note && (
                        <span className="text-[11px] leading-snug text-muted">{cell.note}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </Row>
          );
        })}

        {/* Overall row */}
        <Row>
          <div className="flex items-center px-3 py-4">
            <span className="text-sm font-semibold">Overall Gap Score</span>
          </div>
          {columns.map((col) => (
            <div
              key={col.adId}
              className={cn(
                "rounded-b-xl px-3 py-4",
                col.isClient ? "bg-accent/[0.07]" : "bg-surface-2/30"
              )}
            >
              <div className="flex items-baseline gap-1">
                <span className={cn("text-2xl font-semibold tabular-nums", overallTone(col.overall))}>
                  {col.overall}
                </span>
                <span className="text-xs text-muted">/100</span>
              </div>
              <p className={cn("text-[11px] font-medium", overallTone(col.overall))}>{col.label}</p>
            </div>
          ))}
        </Row>
      </div>
    </div>
  );
}

/** A grid "row" — React fragment so children land in the parent grid. */
function Row({ children }: { children: React.ReactNode }) {
  return <div className="contents border-t border-border">{children}</div>;
}
