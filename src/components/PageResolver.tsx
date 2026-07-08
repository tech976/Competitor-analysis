"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { X, Search, Loader2, Check, Link2 } from "lucide-react";
import { proxied } from "@/lib/client";

interface Candidate {
  pageId: string;
  pageName: string | null;
  adCount: number;
  sample: string | null;
}

export interface ResolverTarget {
  kind: "client" | "competitor";
  id: string;
  clientId: string; // for SWR revalidation
  currentName: string;
}

function parsePageId(s: string): string | null {
  const t = s.trim();
  if (/^\d{5,}$/.test(t)) return t;
  const m = t.match(/view_all_page_id=(\d+)/) || t.match(/[?&]id=(\d+)/);
  return m ? m[1] : null;
}

export default function PageResolver({
  target,
  onClose,
}: {
  target: ResolverTarget;
  onClose: () => void;
}) {
  const { mutate } = useSWRConfig();
  const [query, setQuery] = useState(target.currentName);
  const [pages, setPages] = useState<Candidate[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  const endpoint =
    target.kind === "client"
      ? `/api/clients/${target.id}`
      : `/api/competitors/${target.id}`;

  async function find() {
    setBusy(true);
    setError(null);
    setPages(null);
    try {
      const r = await fetch(`/api/resolve-pages?q=${encodeURIComponent(query)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Search failed.");
      setPages(d.pages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  }

  async function save(pageId: string, pageName: string | null) {
    setSaving(pageId);
    setError(null);
    try {
      const r = await fetch(endpoint, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pageId, pageName: pageName ?? query }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save failed.");
      await mutate(`/api/clients/${target.clientId}`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
      setSaving(null);
    }
  }

  function saveManual() {
    const pid = parsePageId(manual);
    if (!pid) {
      setError("Couldn't find a page id in that. Paste an Ad Library page URL or a numeric page id.");
      return;
    }
    save(pid, query);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="glass w-full max-w-lg p-5">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-base font-semibold">Set exact Facebook page</h3>
          <button className="btn-ghost h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-xs text-muted">
          Scraping by name can pull unrelated advertisers. Pick the real page so every
          scan is accurate.
        </p>

        <div className="flex gap-2">
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Brand name"
            onKeyDown={(e) => e.key === "Enter" && find()}
          />
          <button className="btn-primary shrink-0" onClick={find} disabled={busy || !query.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Find
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-behind">{error}</p>}

        {pages && (
          <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
            {pages.length === 0 ? (
              <p className="text-sm text-muted">No pages found. Try a different spelling.</p>
            ) : (
              pages.map((p) => {
                const img = proxied(p.sample);
                return (
                  <div key={p.pageId} className="glass-2 flex items-center gap-3 p-2.5">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-canvas">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.pageName ?? "Unknown page"}</p>
                      <p className="text-[11px] text-muted">
                        {p.adCount} live ad{p.adCount === 1 ? "" : "s"} · id {p.pageId}
                      </p>
                    </div>
                    <button
                      className="btn-primary h-8 px-3 text-xs"
                      onClick={() => save(p.pageId, p.pageName)}
                      disabled={saving !== null}
                    >
                      {saving === p.pageId ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Use this
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        <div className="mt-4 border-t border-border pt-3">
          <p className="label mb-1.5">Or paste the Ad Library page URL / page id</p>
          <div className="flex gap-2">
            <input
              className="input"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="…?view_all_page_id=123456789  or  123456789"
            />
            <button className="btn-ghost shrink-0" onClick={saveManual} disabled={saving !== null || !manual.trim()}>
              <Link2 className="h-4 w-4" /> Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
