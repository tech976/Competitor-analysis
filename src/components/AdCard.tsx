import { Trophy, Play, ExternalLink, Clock } from "lucide-react";
import type { AdLite } from "@/lib/api-types";
import { proxied } from "@/lib/client";
import { cn } from "@/lib/cn";

/** One ad tile — creative thumbnail, winner badge, days-live, winning score. */
export default function AdCard({ ad }: { ad: AdLite }) {
  const img = proxied(ad.imageUrl);
  const isVideo = ad.mediaType === "VIDEO" || ad.mediaType === "REEL";

  return (
    <div className="group glass-2 overflow-hidden">
      <div className="relative aspect-[4/5] overflow-hidden bg-canvas">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={ad.headline ?? "Ad creative"}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full place-items-center text-xs text-muted">
            {isVideo ? "Video ad" : "No preview"}
          </div>
        )}

        {isVideo && (
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-black/55 backdrop-blur">
              <Play className="h-5 w-5 fill-white text-white" />
            </span>
          </span>
        )}

        {ad.isProvenWinner && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300 backdrop-blur">
            <Trophy className="h-3 w-3" /> Winner
          </span>
        )}

        {ad.winningScore != null && (
          <span
            className={cn(
              "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur",
              ad.winningScore >= 66
                ? "bg-lead/20 text-lead"
                : ad.winningScore >= 40
                ? "bg-par/20 text-par"
                : "bg-surface/70 text-muted"
            )}
          >
            {Math.round(ad.winningScore)}
          </span>
        )}
      </div>

      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {ad.daysLiveLatest != null ? `${ad.daysLiveLatest}d live` : "—"}
          </span>
          <span>{ad.mediaType.toLowerCase()}</span>
        </div>

        {ad.headline && (
          <p className="line-clamp-1 text-sm font-medium">{ad.headline}</p>
        )}
        {ad.primaryText && (
          <p className="line-clamp-2 text-xs text-muted">{ad.primaryText}</p>
        )}

        {ad.analysis?.whyItWorks && (
          <p className="line-clamp-2 rounded-md bg-accent/10 px-2 py-1.5 text-[11px] text-accent-soft">
            {ad.analysis.whyItWorks}
          </p>
        )}

        {ad.adLibraryUrl && (
          <a
            href={ad.adLibraryUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-white"
          >
            Ad Library <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}
