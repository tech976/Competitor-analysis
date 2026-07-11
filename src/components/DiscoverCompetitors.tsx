"use client";

import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { X, Sparkles, Loader2, Plus, Check, RotateCw } from "lucide-react";
import type { DiscoveredCompetitor } from "@/lib/api-types";
import { postJSON } from "@/lib/client";

function closenessColor(n: number) {
  return n >= 8 ? "#34d399" : n >= 5 ? "#fbbf24" : "#8b8b9a";
}
function closenessBg(n: number) {
  return n >= 8 ? "rgba(52,211,153,.14)" : n >= 5 ? "rgba(251,191,36,.14)" : "rgba(139,139,154,.12)";
}

/** AI-suggested closest competitors for a client, add with one click. */
export default function DiscoverCompetitors({
  clientId,
  onClose,
}: {
  clientId: string;
  onClose: () => void;
}) {
  const { mutate } = useSWRConfig();
  const [list, setList] = useState<DiscoveredCompetitor[] | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const r = await postJSON<{ competitors: DiscoveredCompetitor[] }>(
        `/api/clients/${clientId}/discover`,
        {}
      );
      setList(r.competitors);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discovery failed.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add(name: string) {
    setAdding(name);
    setError(null);
    try {
      await postJSON(`/api/clients/${clientId}/competitors`, { name });
      setAdded((prev) => new Set(prev).add(name.toLowerCase()));
      await mutate(`/api/clients/${clientId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add competitor.");
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="glass w-full max-w-lg p-5">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="inline-flex items-center gap-2 text-base font-semibold">
            <Sparkles className="h-4 w-4 text-accent-soft" /> Discover competitors
          </h3>
          <button className="btn-ghost h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-xs text-muted">
          AI finds the closest brands your client competes with — ranked by how directly they go
          head-to-head. Add the ones you want to track.
        </p>

        {busy && (
          <div className="grid place-items-center py-12 text-sm text-muted">
            <Loader2 className="mb-2 h-6 w-6 animate-spin text-accent-soft" />
            Finding competitors…
          </div>
        )}
        {error && <p className="mb-3 text-sm text-behind">{error}</p>}

        {!busy && list && (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {list.length === 0 ? (
              <p className="text-sm text-muted">
                No suggestions yet — add more brand context (industry, USP) to the client for better results.
              </p>
            ) : (
              list.map((c) => {
                const isAdded = c.alreadyAdded || added.has(c.name.toLowerCase());
                return (
                  <div key={c.name} className="glass-2 flex items-center gap-3 p-3">
                    <div
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                      style={{ background: closenessBg(c.closeness) }}
                      title={`Closeness ${c.closeness}/10`}
                    >
                      <span className="font-mono text-sm font-semibold" style={{ color: closenessColor(c.closeness) }}>
                        {c.closeness}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      {c.why && <p className="truncate text-[11px] text-muted">{c.why}</p>}
                    </div>
                    {isAdded ? (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-lead">
                        <Check className="h-3.5 w-3.5" /> Added
                      </span>
                    ) : (
                      <button
                        className="btn-primary h-8 px-3 text-xs"
                        onClick={() => add(c.name)}
                        disabled={adding !== null}
                      >
                        {adding === c.name ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        Add
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <button className="btn-ghost h-8 px-3 text-xs" onClick={run} disabled={busy}>
            <RotateCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <span className="text-[11px] text-muted/80">Tip: set each added competitor&apos;s exact page for accurate scans.</span>
        </div>
      </div>
    </div>
  );
}
