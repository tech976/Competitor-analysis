"use client";

import useSWR from "swr";
import Link from "next/link";
import { ScanLine, Trophy, Gauge, Swords, Megaphone } from "lucide-react";
import { FadeIn } from "@/components/ui/motion";
import { GradientText } from "@/components/ui/GradientText";
import CountUp from "@/components/ui/CountUp";
import { cn } from "@/lib/cn";

interface Overview {
  kpis: {
    totalScans: number;
    winningAds: number;
    avgGapScore: number;
    totalCompetitors: number;
    totalAds: number;
  };
  recentScans: Array<{
    id: string;
    clientId: string;
    clientName: string;
    adsFetched: number;
    gapScore: number | null;
    status: string;
    startedAt: string;
  }>;
  topCompetitors: Array<{ name: string; rating: number }>;
}

const KPIS = [
  { key: "totalScans", label: "Total Scans", Icon: ScanLine, suffix: "" },
  { key: "winningAds", label: "Winning Ads Found", Icon: Trophy, suffix: "" },
  { key: "avgGapScore", label: "Avg Gap Score", Icon: Gauge, suffix: "/100" },
  { key: "totalCompetitors", label: "Competitors", Icon: Swords, suffix: "" },
  { key: "totalAds", label: "Ads Analyzed", Icon: Megaphone, suffix: "" },
] as const;

export default function DashboardOverview() {
  const { data } = useSWR<Overview>("/api/overview");

  return (
    <div className="mx-auto max-w-6xl">
      <FadeIn className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          <GradientText>Dashboard</GradientText> Overview
        </h1>
        <p className="mt-1 text-sm text-muted">
          Your competitive ad intelligence at a glance.
        </p>
      </FadeIn>

      {/* KPI cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {KPIS.map(({ key, label, Icon, suffix }, i) => (
          <FadeIn key={key} delay={i * 0.05}>
            <div className="glass p-5">
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent-soft">
                <Icon className="h-[18px] w-[18px]" />
              </div>
              <div className="text-2xl font-semibold tabular-nums">
                {data ? <CountUp value={data.kpis[key]} /> : "—"}
                <span className="text-sm text-muted">{suffix}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted">{label}</p>
            </div>
          </FadeIn>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Recent scans */}
        <FadeIn delay={0.1} className="glass p-5">
          <h3 className="mb-4 text-sm font-semibold">Recent Scans</h3>
          {!data?.recentScans.length ? (
            <p className="py-8 text-center text-sm text-muted">
              No scans yet — run one from a client.
            </p>
          ) : (
            <div className="space-y-2">
              {data.recentScans.map((s) => (
                <Link
                  key={s.id}
                  href={`/clients/${s.clientId}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 transition hover:bg-surface-2/50"
                >
                  <div>
                    <p className="text-sm font-medium">{s.clientName}</p>
                    <p className="text-xs text-muted">
                      {new Date(s.startedAt).toLocaleDateString()} · {s.adsFetched} ads
                    </p>
                  </div>
                  {s.gapScore != null ? (
                    <ScorePill value={s.gapScore} />
                  ) : (
                    <span className="text-xs text-muted">{s.status.toLowerCase()}</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </FadeIn>

        {/* Top competitors */}
        <FadeIn delay={0.15} className="glass p-5">
          <h3 className="mb-4 text-sm font-semibold">Top Competitors</h3>
          {!data?.topCompetitors.length ? (
            <p className="py-8 text-center text-sm text-muted">No ratings yet.</p>
          ) : (
            <div className="space-y-1.5">
              {data.topCompetitors.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3 rounded-lg px-3 py-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-2 text-xs font-medium text-muted">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-sm">{c.name}</span>
                  <span className="rounded-md bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent-soft">
                    {c.rating}/10
                  </span>
                </div>
              ))}
            </div>
          )}
        </FadeIn>
      </div>
    </div>
  );
}

function ScorePill({ value }: { value: number }) {
  const tone =
    value >= 66 ? "text-lead bg-lead/10" : value >= 40 ? "text-par bg-par/10" : "text-behind bg-behind/10";
  return (
    <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", tone)}>
      {value}/100
    </span>
  );
}
