import { Trophy } from "lucide-react";
import type { CompetitorAssessmentLite } from "@/lib/api-types";
import ScoreGauge from "@/components/ui/ScoreGauge";

/** A competitor's 1–10 rating + what to learn from them. */
export default function CompetitorRatingCard({
  a,
}: {
  a: CompetitorAssessmentLite;
}) {
  return (
    <div className="glass-2 flex gap-4 p-4">
      <ScoreGauge value={a.rating} max={10} size={88} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="truncate text-sm font-semibold">{a.competitor.name}</h4>
          {a.winnerCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-300">
              <Trophy className="h-3 w-3" /> {a.winnerCount}
            </span>
          )}
        </div>
        {a.summary && <p className="mt-1 line-clamp-3 text-xs text-muted">{a.summary}</p>}
        {a.topStrength && (
          <p className="mt-2 rounded-md bg-accent/10 px-2 py-1 text-[11px] text-accent-soft">
            Learn from them: {a.topStrength}
          </p>
        )}
      </div>
    </div>
  );
}
