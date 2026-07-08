"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { Loader2, Radar } from "lucide-react";
import { postJSON } from "@/lib/client";
import { fmtUsd } from "@/lib/pricing";

interface ScanResult {
  adsFetched: number;
  winners: number;
  scrapeCost: number;
  comparisonId: string | null;
  aiError: string | null;
}

/** Trigger a full scan for a client and revalidate its data when done. */
export default function RunScanButton({ clientId }: { clientId: string }) {
  const { mutate } = useSWRConfig();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const r = await postJSON<ScanResult>("/api/scan", { clientId });
      await Promise.all([
        mutate(`/api/clients/${clientId}`),
        mutate((key) => typeof key === "string" && key.startsWith("/api/ads")),
        mutate("/api/clients"),
      ]);
      setMsg(
        `Scanned ${r.adsFetched} ads · ${r.winners} winners · ${fmtUsd(r.scrapeCost)}` +
          (r.aiError ? " · AI step skipped" : "")
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button className="btn-primary" onClick={run} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
        {busy ? "Scanning…" : "Run scan"}
      </button>
      {msg && <span className="text-[11px] text-lead">{msg}</span>}
      {error && <span className="max-w-xs text-right text-[11px] text-behind">{error}</span>}
    </div>
  );
}
