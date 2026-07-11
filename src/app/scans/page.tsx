"use client";

import useSWR from "swr";
import Link from "next/link";
import { ScanLine, ArrowRight } from "lucide-react";
import { FadeIn } from "@/components/ui/motion";
import { GradientText } from "@/components/ui/GradientText";
import { cn } from "@/lib/cn";

interface ScanItem {
  id: string;
  clientId: string;
  clientName: string;
  competitors: number;
  adsFetched: number;
  gapScore: number | null;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
  scrapeCost: number;
  startedAt: string;
}

const STATUS: Record<string, string> = {
  SUCCEEDED: "text-lead bg-lead/10 border-lead/30",
  RUNNING: "text-par bg-par/10 border-par/30",
  PENDING: "text-muted bg-surface-2 border-border",
  FAILED: "text-behind bg-behind/10 border-behind/30",
};

function gapTone(v: number) {
  return v >= 66 ? "text-lead bg-lead/10" : v >= 40 ? "text-par bg-par/10" : "text-behind bg-behind/10";
}

export default function ScansPage() {
  const { data, isLoading } = useSWR<{ scans: ScanItem[] }>("/api/scans");
  const scans = data?.scans ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <FadeIn className="mb-6">
        <h1 className="inline-flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <ScanLine className="h-7 w-7 text-accent-soft" />
          <GradientText>Ad</GradientText> Scans
        </h1>
        <p className="mt-1 text-sm text-muted">Every scan across all clients — newest first.</p>
      </FadeIn>

      {isLoading ? (
        <div className="glass h-64 animate-pulse" />
      ) : scans.length === 0 ? (
        <p className="glass px-6 py-16 text-center text-sm text-muted">
          No scans yet — open a client and hit <span className="text-white">Run scan</span>.
        </p>
      ) : (
        <FadeIn delay={0.05} className="glass overflow-x-auto p-1.5">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted/60">
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Competitors</th>
                <th className="px-4 py-3 font-medium">Ads found</th>
                <th className="px-4 py-3 font-medium">Gap score</th>
                <th className="px-4 py-3 font-medium">Cost</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {scans.map((s) => (
                <tr key={s.id} className="border-t border-border/60 transition hover:bg-surface-2/40">
                  <td className="px-4 py-3 font-medium">{s.clientName}</td>
                  <td className="px-4 py-3 tabular-nums text-muted">{s.competitors}</td>
                  <td className="px-4 py-3 tabular-nums text-muted">{s.adsFetched}</td>
                  <td className="px-4 py-3">
                    {s.gapScore != null ? (
                      <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums", gapTone(s.gapScore))}>
                        {s.gapScore}/100
                      </span>
                    ) : (
                      <span className="text-xs text-muted/60">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs tabular-nums text-muted">
                    ${s.scrapeCost.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {new Date(s.startedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", STATUS[s.status] ?? STATUS.PENDING)}>
                      {s.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/clients/${s.clientId}`} className="inline-flex items-center gap-1 text-xs text-accent-soft hover:gap-2">
                      View <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </FadeIn>
      )}
    </div>
  );
}
