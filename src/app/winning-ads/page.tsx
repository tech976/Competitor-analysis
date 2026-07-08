"use client";

import useSWR from "swr";
import { Trophy } from "lucide-react";
import type { AdLite } from "@/lib/api-types";
import { FadeIn } from "@/components/ui/motion";
import { GradientText } from "@/components/ui/GradientText";
import AdCard from "@/components/AdCard";

type WinnerAd = AdLite & { client?: { id: string; name: string } };

export default function WinningAdsPage() {
  const { data, isLoading } = useSWR<{ ads: WinnerAd[] }>("/api/winning-ads");
  const ads = data?.ads ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <FadeIn className="mb-6">
        <h1 className="inline-flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <Trophy className="h-7 w-7 text-amber-300" />
          <GradientText>Winning</GradientText> Ads
        </h1>
        <p className="mt-1 text-sm text-muted">
          Competitors&apos; proven winners — long-running, scaled creatives worth learning from.
        </p>
      </FadeIn>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="glass-2 h-72 animate-pulse" />
          ))}
        </div>
      ) : ads.length === 0 ? (
        <p className="glass px-6 py-16 text-center text-sm text-muted">
          No winners yet — run a scan on a client to surface competitors&apos; winning ads.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {ads.map((ad, i) => (
            <FadeIn key={ad.id} delay={i * 0.03}>
              <AdCard ad={ad} />
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  );
}
