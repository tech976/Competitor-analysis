import { Sparkles, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";
import type { ComparisonLite, ComparisonDimensionLite } from "@/lib/api-types";
import { FadeIn } from "@/components/ui/motion";
import ScoreGauge from "@/components/ui/ScoreGauge";
import Mark from "@/components/ui/Mark";
import Markdown from "@/components/ui/Markdown";
import CompetitorRatingCard from "@/components/CompetitorRatingCard";
import { cn } from "@/lib/cn";

const DIMENSION_LABELS: Record<string, string> = {
  AD_VOLUME: "Ad volume",
  PROVEN_WINNERS: "Proven winners",
  FORMAT_MIX: "Format mix",
  CREATIVE_QUALITY: "Creative quality",
  HOOK: "Hook strength",
  ON_SCREEN_TEXT: "On-screen text",
  OFFER_CLARITY: "Offer clarity",
  CTA: "Call to action",
  MESSAGING_ANGLES: "Messaging angles",
  EMOTIONAL_APPEAL: "Emotional appeal",
  SOCIAL_PROOF: "Social proof",
  CREATIVE_FRESHNESS: "Creative freshness",
};

export default function ComparisonView({ c }: { c: ComparisonLite }) {
  // Show the gaps first (most actionable), then leads.
  const order = { BEHIND: 0, PAR: 1, LEAD: 2 } as const;
  const dims = [...c.dimensions].sort((a, b) => order[a.mark] - order[b.mark]);

  return (
    <div className="space-y-8">
      {/* Headline: gap score + AI TL;DR */}
      <FadeIn>
        <div className="glass flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-center">
          {c.gapScore != null && (
            <ScoreGauge value={c.gapScore} label="Opportunity" />
          )}
          <div className="flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent-soft">
              <Sparkles className="h-3.5 w-3.5" /> AI summary
            </span>
            {c.tldr && <p className="mt-3 text-lg font-medium leading-snug">{c.tldr}</p>}
            {c.overallSummary && (
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.overallSummary}</p>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Competitor 1–10 ratings */}
      {c.competitors.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-white/90">Competitor ratings</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {c.competitors.map((a, i) => (
              <FadeIn key={a.id} delay={i * 0.05}>
                <CompetitorRatingCard a={a} />
              </FadeIn>
            ))}
          </div>
        </section>
      )}

      {/* Per-aspect comparison cards */}
      {dims.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-white/90">
            Aspect-by-aspect comparison
          </h3>
          <div className="space-y-3">
            {dims.map((d, i) => (
              <FadeIn key={d.id} delay={i * 0.03}>
                <DimensionRow d={d} />
              </FadeIn>
            ))}
          </div>
        </section>
      )}

      {/* Narrative sections */}
      <div className="grid gap-4 lg:grid-cols-3">
        {c.lackingSummary && (
          <Panel
            title="Where you're lacking"
            Icon={AlertTriangle}
            tone="behind"
            content={c.lackingSummary}
          />
        )}
        {c.salesGrowthPlan && (
          <Panel
            title="To grow sales"
            Icon={TrendingUp}
            tone="lead"
            content={c.salesGrowthPlan}
          />
        )}
        {c.suggestions && (
          <Panel
            title="Next-campaign ideas"
            Icon={Lightbulb}
            tone="accent"
            content={c.suggestions}
          />
        )}
      </div>
    </div>
  );
}

function DimensionRow({ d }: { d: ComparisonDimensionLite }) {
  const label = DIMENSION_LABELS[d.dimension] ?? d.dimension;
  return (
    <div className="glass-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">{label}</h4>
        <Mark value={d.mark} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <ScoreBar label="You" value={d.clientScore} tone="client" />
        <ScoreBar label="Best rival" value={d.competitorBestScore} tone="rival" />
      </div>
      {d.reasoning && <p className="mt-3 text-xs text-muted">{d.reasoning}</p>}
      {d.fix && (
        <p className="mt-2 rounded-md bg-accent/10 px-2.5 py-1.5 text-xs text-accent-soft">
          <span className="font-medium">Fix:</span> {d.fix}
        </p>
      )}
    </div>
  );
}

function ScoreBar({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | null;
  tone: "client" | "rival";
}) {
  const pct = ((value ?? 0) / 10) * 100;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] text-muted">
        <span>{label}</span>
        <span className="tabular-nums">{value ?? "—"}/10</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
        <div
          className={cn("h-full rounded-full", tone === "client" ? "bg-accent" : "bg-fuchsia-400/70")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Panel({
  title,
  Icon,
  tone,
  content,
}: {
  title: string;
  Icon: typeof TrendingUp;
  tone: "lead" | "behind" | "accent";
  content: string;
}) {
  const toneCls = {
    lead: "text-lead",
    behind: "text-behind",
    accent: "text-accent-soft",
  }[tone];
  return (
    <div className="glass p-5">
      <h3 className={cn("mb-3 inline-flex items-center gap-2 text-sm font-semibold", toneCls)}>
        <Icon className="h-4 w-4" /> {title}
      </h3>
      <Markdown content={content} />
    </div>
  );
}
