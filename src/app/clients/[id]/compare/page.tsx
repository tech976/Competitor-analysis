"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, Swords, Loader2, Plus, X, FileDown, Share2 } from "lucide-react";
import type { AdLite, ColumnsResult } from "@/lib/api-types";
import { postJSON } from "@/lib/client";
import { FadeIn } from "@/components/ui/motion";
import { GradientText } from "@/components/ui/GradientText";
import ComparisonColumns from "@/components/ComparisonColumns";
import ComparisonDeepDive from "@/components/ComparisonDeepDive";

export default function ComparePage() {
  const { id } = useParams<{ id: string }>();
  const { data: clientAds } = useSWR<{ ads: AdLite[] }>(
    id ? `/api/ads?clientId=${id}&type=CLIENT&take=100` : null
  );
  const { data: rivalAds } = useSWR<{ ads: AdLite[] }>(
    id ? `/api/ads?clientId=${id}&type=COMPETITOR&take=100` : null
  );
  const { data: client } = useSWR<{ client: { name: string } }>(
    id ? `/api/clients/${id}` : null
  );

  const clients = useMemo(() => clientAds?.ads ?? [], [clientAds]);
  const rivals = useMemo(() => rivalAds?.ads ?? [], [rivalAds]);

  const adsById = useMemo(() => {
    const m: Record<string, AdLite> = {};
    for (const a of [...clients, ...rivals]) m[a.id] = a;
    return m;
  }, [clients, rivals]);

  const [clientAdId, setClientAdId] = useState("");
  const [rivalIds, setRivalIds] = useState<string[]>([""]);
  const [result, setResult] = useState<ColumnsResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientAdId && clients.length) setClientAdId(clients[0].id);
  }, [clients, clientAdId]);
  useEffect(() => {
    if (rivalIds[0] === "" && rivals.length) {
      const winners = rivals.filter((r) => r.isProvenWinner);
      setRivalIds([(winners[0] ?? rivals[0]).id]);
    }
  }, [rivals, rivalIds]);

  function setRival(i: number, v: string) {
    setRivalIds((prev) => prev.map((x, j) => (j === i ? v : x)));
  }
  function addRival() {
    if (rivalIds.length >= 3) return;
    const used = new Set(rivalIds);
    const next = rivals.find((r) => !used.has(r.id));
    setRivalIds((prev) => [...prev, next?.id ?? ""]);
  }
  function removeRival(i: number) {
    setRivalIds((prev) => prev.filter((_, j) => j !== i));
  }

  async function run() {
    const competitorAdIds = rivalIds.filter(Boolean);
    if (!clientAdId || competitorAdIds.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const r = await postJSON<{ result: ColumnsResult }>("/api/multi-compare", {
        clientAdId,
        competitorAdIds,
      });
      setResult(r.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex items-center justify-between">
        <Link
          href={`/clients/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> {client?.client.name ?? "Client"}
        </Link>
        <div className="no-print flex items-center gap-2">
          <button
            className="btn-ghost h-9 px-3 text-xs"
            onClick={() => window.print()}
            disabled={!result}
            title={result ? "Print / Save as PDF" : "Run a comparison first"}
          >
            <FileDown className="h-4 w-4" /> Export PDF
          </button>
          <button className="btn-ghost h-9 px-3 text-xs" disabled title="Coming soon">
            <Share2 className="h-4 w-4" /> Share
          </button>
        </div>
      </div>

      <FadeIn className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          <GradientText>One-to-One</GradientText> Ad Comparison
        </h1>
        <p className="mt-1 text-sm text-muted">
          {client?.client.name ?? "Your brand"} vs up to 3 competitor ads — scored aspect by aspect.
        </p>
      </FadeIn>

      {/* Selectors */}
      <FadeIn delay={0.05} className="no-print glass mb-8 p-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <Picker label="Your ad" ads={clients} value={clientAdId} onChange={setClientAdId} empty="No client ads yet." />
          <div className="space-y-2">
            <span className="label block">Competitor ads</span>
            {rivalIds.map((rid, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  className="input"
                  value={rid}
                  onChange={(e) => setRival(i, e.target.value)}
                >
                  <option value="">Select…</option>
                  {rivals.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.isProvenWinner ? "🏆 " : ""}
                      {a.advertiserName} · {a.mediaType.toLowerCase()} · {a.daysLiveLatest ?? "—"}d
                    </option>
                  ))}
                </select>
                {rivalIds.length > 1 && (
                  <button className="btn-ghost h-9 px-2" onClick={() => removeRival(i)}>
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {rivalIds.length < 3 && (
              <button className="btn-ghost h-8 px-3 text-xs" onClick={addRival}>
                <Plus className="h-3.5 w-3.5" /> Add competitor
              </button>
            )}
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button className="btn-primary" onClick={run} disabled={busy || !clientAdId}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
            Compare
          </button>
        </div>
      </FadeIn>

      {error && <p className="mb-4 text-sm text-behind">{error}</p>}

      {busy && (
        <div className="glass grid place-items-center py-16 text-sm text-muted">
          <Loader2 className="mb-2 h-6 w-6 animate-spin text-accent-soft" />
          Scoring ads aspect by aspect…
        </div>
      )}

      {!busy && result && (
        <div id="report">
          <ComparisonColumns result={result} adsById={adsById} />
          <ComparisonDeepDive result={result} adsById={adsById} />
        </div>
      )}

      {!busy && !result && (
        <p className="glass px-6 py-12 text-center text-sm text-muted">
          Pick your ad and competitor ads, then hit <span className="text-white">Compare</span>.
        </p>
      )}
    </div>
  );
}

function Picker({
  label,
  ads,
  value,
  onChange,
  empty,
}: {
  label: string;
  ads: AdLite[];
  value: string;
  onChange: (v: string) => void;
  empty: string;
}) {
  return (
    <label className="block">
      <span className="label mb-1.5 block">{label}</span>
      {ads.length === 0 ? (
        <span className="block rounded-lg border border-border bg-canvas/60 px-3 py-2 text-sm text-muted">
          {empty}
        </span>
      ) : (
        <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
          {ads.map((a) => (
            <option key={a.id} value={a.id}>
              {a.advertiserName} · {a.mediaType.toLowerCase()} · {a.daysLiveLatest ?? "—"}d
              {a.headline ? ` · ${a.headline.slice(0, 28)}` : ""}
            </option>
          ))}
        </select>
      )}
    </label>
  );
}
