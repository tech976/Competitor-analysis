"use client";

import useSWR from "swr";
import Link from "next/link";
import { Bell, Sparkle, TrendingUp, Clock, ExternalLink, Trophy } from "lucide-react";
import { FadeIn } from "@/components/ui/motion";
import { GradientText } from "@/components/ui/GradientText";
import { proxied } from "@/lib/client";

interface AlertAd {
  id: string;
  advertiserName: string;
  advertiserPageName: string | null;
  clientId: string;
  clientName: string;
  mediaType: string;
  headline: string | null;
  daysLive: number | null;
  winningScore: number | null;
  isProvenWinner: boolean;
  imageUrl: string | null;
  adLibraryUrl: string | null;
  firstSeenAt: string;
  scoreDelta?: number;
  deployDelta?: number;
}

export default function AlertsPage() {
  const { data, isLoading } = useSWR<{ newAds: AlertAd[]; rising: AlertAd[] }>("/api/alerts");
  const newAds = data?.newAds ?? [];
  const rising = data?.rising ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <FadeIn className="mb-6">
        <h1 className="inline-flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <Bell className="h-7 w-7 text-accent-soft" />
          <GradientText>Alerts</GradientText>
        </h1>
        <p className="mt-1 text-sm text-muted">
          What competitors just launched, and which ads they&apos;re scaling up — from your scan history.
        </p>
      </FadeIn>

      {isLoading ? (
        <div className="glass h-64 animate-pulse" />
      ) : newAds.length === 0 && rising.length === 0 ? (
        <p className="glass px-6 py-16 text-center text-sm text-muted">
          No changes detected yet — alerts appear as you re-scan clients over time.
        </p>
      ) : (
        <div className="space-y-8">
          <Section
            title="New competitor ads"
            hint="Freshly launched — live 21 days or less"
            Icon={Sparkle}
            ads={newAds}
          />
          <Section
            title="Scaling up"
            hint="Winning score or creative count rose across scans"
            Icon={TrendingUp}
            ads={rising}
            rising
          />
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  hint,
  Icon,
  ads,
  rising,
}: {
  title: string;
  hint: string;
  Icon: typeof Sparkle;
  ads: AlertAd[];
  rising?: boolean;
}) {
  return (
    <section>
      <h2 className="mb-1 inline-flex items-center gap-2 text-sm font-semibold text-white/90">
        <Icon className="h-4 w-4 text-accent-soft" /> {title}
        <span className="text-xs font-normal text-muted">({ads.length})</span>
      </h2>
      <p className="mb-3 text-xs text-muted">{hint}</p>
      {ads.length === 0 ? (
        <p className="glass-2 px-4 py-6 text-center text-sm text-muted">Nothing here yet.</p>
      ) : (
        <div className="space-y-2">
          {ads.map((a, i) => (
            <FadeIn key={a.id} delay={i * 0.03}>
              <div className="glass-2 flex items-center gap-3 p-3">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-canvas">
                  {proxied(a.imageUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={proxied(a.imageUrl)} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {a.advertiserPageName ?? a.advertiserName}
                    {a.isProvenWinner && <Trophy className="ml-1.5 inline h-3 w-3 text-amber-300" />}
                  </p>
                  <p className="truncate text-[11px] text-muted">
                    for <Link href={`/clients/${a.clientId}`} className="text-accent-soft hover:underline">{a.clientName}</Link>
                    {" · "}{a.mediaType.toLowerCase()}
                    {a.daysLive != null && (
                      <> · <Clock className="inline h-3 w-3" /> {a.daysLive}d</>
                    )}
                  </p>
                </div>
                {rising && a.scoreDelta != null ? (
                  <span className="whitespace-nowrap rounded-full bg-lead/10 px-2.5 py-1 text-xs font-semibold text-lead">
                    +{a.scoreDelta} score
                  </span>
                ) : (
                  a.winningScore != null && (
                    <span className="whitespace-nowrap rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent-soft">
                      WS {Math.round(a.winningScore)}
                    </span>
                  )
                )}
                {a.adLibraryUrl && (
                  <a href={a.adLibraryUrl} target="_blank" rel="noreferrer" className="text-muted hover:text-white">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      )}
    </section>
  );
}
