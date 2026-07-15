"use client";

import { useState } from "react";
import useSWR from "swr";
import { FileText, Printer, Trophy, Swords, Layers, Target } from "lucide-react";
import type { ClientListItem, ComparisonLite } from "@/lib/api-types";
import { FadeIn } from "@/components/ui/motion";
import { GradientText } from "@/components/ui/GradientText";
import ComparisonView from "@/components/ComparisonView";

interface ReportData {
  client: {
    id: string;
    name: string;
    industry: string | null;
    geography: string | null;
  };
  kpis: {
    gapScore: number | null;
    competitorWinners: number;
    competitors: number;
    totalAds: number;
    generatedAt: string | null;
  };
  comparison: ComparisonLite | null;
}

export default function ReportsPage() {
  const { data: clientsData } = useSWR<{ clients: ClientListItem[] }>("/api/clients");
  const clients = clientsData?.clients ?? [];
  const [clientId, setClientId] = useState("");

  const { data: report, isLoading } = useSWR<ReportData>(
    clientId ? `/api/reports?clientId=${clientId}` : null
  );

  return (
    <div className="mx-auto max-w-5xl pb-16">
      {/* Controls (hidden when printing) */}
      <FadeIn className="no-print mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="inline-flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <FileText className="h-7 w-7 text-accent-soft" />
            <GradientText>Reports</GradientText>
          </h1>
          <p className="mt-1 text-sm text-muted">
            A client-ready gap-analysis report from the latest scan. Print or save as PDF.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="">Select a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {report?.comparison && (
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-fg shadow-glow transition hover:brightness-110"
            >
              <Printer className="h-4 w-4" /> Print / PDF
            </button>
          )}
        </div>
      </FadeIn>

      {!clientId ? (
        <p className="glass px-6 py-16 text-center text-sm text-muted">
          Pick a client to generate its report.
        </p>
      ) : isLoading ? (
        <div className="glass h-96 animate-pulse" />
      ) : !report ? (
        <p className="glass px-6 py-16 text-center text-sm text-behind">
          Could not load the report.
        </p>
      ) : (
        <div className="space-y-6">
          {/* Report header */}
          <FadeIn className="glass p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-accent-soft">
                  Competitor Ad Gap Report
                </p>
                <h2 className="mt-1 text-2xl font-semibold">{report.client.name}</h2>
                <p className="mt-0.5 text-sm text-muted">
                  {[report.client.industry, report.client.geography]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
              <div className="text-right text-xs text-muted">
                <p>Prepared by Digiveritaz</p>
                {report.kpis.generatedAt && (
                  <p>{new Date(report.kpis.generatedAt).toLocaleDateString()}</p>
                )}
              </div>
            </div>

            {/* KPI row */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi Icon={Target} label="Opportunity" value={report.kpis.gapScore != null ? `${report.kpis.gapScore}/100` : "—"} />
              <Kpi Icon={Trophy} label="Rival winners" value={String(report.kpis.competitorWinners)} />
              <Kpi Icon={Swords} label="Competitors" value={String(report.kpis.competitors)} />
              <Kpi Icon={Layers} label="Ads analysed" value={report.kpis.totalAds.toLocaleString()} />
            </div>
          </FadeIn>

          {report.comparison ? (
            <ComparisonView c={report.comparison} />
          ) : (
            <p className="glass px-6 py-16 text-center text-sm text-muted">
              No comparison yet for this client. Run a scan (which builds the gap
              analysis), then come back to generate the report.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Kpi({
  Icon,
  label,
  value,
}: {
  Icon: typeof Target;
  label: string;
  value: string;
}) {
  return (
    <div className="glass-2 px-3 py-3">
      <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold text-fg">{value}</p>
    </div>
  );
}
