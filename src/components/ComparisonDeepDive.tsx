"use client";

import { Fragment } from "react";
import { Trophy, AlertTriangle, Wrench, Sparkles, ExternalLink } from "lucide-react";
import type { AdLite, ColumnsResult } from "@/lib/api-types";
import { FadeIn } from "@/components/ui/motion";
import RadarChart from "@/components/ui/RadarChart";
import { cn } from "@/lib/cn";

/** 1-to-1 deep dive: You vs the toughest competitor — radar + insights. */
export default function ComparisonDeepDive({
  result,
  adsById = {},
}: {
  result: ColumnsResult;
  adsById?: Record<string, AdLite>;
}) {
  const { insights, columns, aspects } = result;
  if (!insights) return null;

  const you = columns.find((c) => c.isClient);
  const rival = columns.find((c) => c.adId === insights.vsAdId);
  if (!you || !rival) return null;

  const labels = aspects.map((a) => a.label);
  const a = aspects.map((asp) => you.scores[asp.key]?.score ?? 0);
  const b = aspects.map((asp) => rival.scores[asp.key]?.score ?? 0);

  const yourLink = adsById[you.adId]?.adLibraryUrl;
  const rivalLink = adsById[rival.adId]?.adLibraryUrl;

  return (
    <div className="mt-8">
      <FadeIn>
        <h2 className="mb-1 inline-flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5 text-accent-soft" />
          1-to-1 Deep Dive
        </h2>
        <p className="mb-3 text-sm text-muted">
          Your ad vs <span className="text-fg">{insights.vsName}</span> — your toughest competitor here.
        </p>
        {(yourLink || rivalLink) && (
          <div className="mb-4 flex flex-wrap gap-4 text-xs">
            {yourLink && (
              <a href={yourLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent-soft hover:underline">
                Your ad on Ad Library <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {rivalLink && (
              <a href={rivalLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent-soft hover:underline">
                {insights.vsName}&apos;s ad on Ad Library <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </FadeIn>

      {insights.verdict && (
        <FadeIn delay={0.05}>
          <p className="glass mb-5 px-5 py-4 text-center text-base font-medium">{insights.verdict}</p>
        </FadeIn>
      )}

      <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
        <FadeIn delay={0.1} className="glass grid place-items-center p-4">
          <RadarChart labels={labels} a={a} b={b} labelA="You" labelB={insights.vsName} />
        </FadeIn>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <Panel title="Why they win" Icon={Trophy} tone="behind" items={insights.whyTheyWin} />
          <Panel title="Where you're losing" Icon={AlertTriangle} tone="behind" items={insights.whereYouLose} />
          <Panel title="Immediate fixes" Icon={Wrench} tone="lead" items={insights.immediateFixes} numbered />
        </div>
      </div>
    </div>
  );
}

/** Render **bold** segments within an insight line. */
function inlineBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-semibold text-fg">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    )
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
  Icon: typeof Trophy;
  tone: "lead" | "behind";
  items: string[];
  numbered?: boolean;
}) {
  return (
    <div className="glass p-4">
      <h3
        className={cn(
          "mb-2.5 inline-flex items-center gap-2 text-sm font-semibold",
          tone === "lead" ? "text-lead" : "text-behind"
        )}
      >
        <Icon className="h-4 w-4" /> {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted">—</p>
      ) : (
        <ol className={cn("space-y-1.5 text-sm text-fg/80", numbered ? "list-decimal pl-5" : "list-none")}>
          {items.map((it, i) => (
            <li key={i} className={numbered ? "" : "flex gap-2"}>
              {!numbered && <span className={tone === "lead" ? "text-lead" : "text-behind"}>•</span>}
              <span>{inlineBold(it)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
