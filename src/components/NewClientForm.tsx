"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { Loader2 } from "lucide-react";
import { postJSON } from "@/lib/client";

/**
 * Create-client form = the start of the Client Context Store. The brand-context
 * fields are what every future analysis is tailored against. (In a later phase
 * these get AI-drafted from the client's site; for now the team fills them.)
 */
export default function NewClientForm({ onDone }: { onDone: () => void }) {
  const { mutate } = useSWRConfig();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    name: "",
    fbPageName: "",
    industry: "",
    targetAudience: "",
    usp: "",
    brandVoice: "",
    goals: "",
    competitors: "",
  });

  function set<K extends keyof typeof f>(k: K, v: string) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return setError("Client name is required.");
    setBusy(true);
    setError(null);
    try {
      await postJSON("/api/clients", {
        name: f.name.trim(),
        fbPageName: f.fbPageName.trim() || undefined,
        competitors: f.competitors
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        context: {
          industry: f.industry.trim() || undefined,
          targetAudience: f.targetAudience.trim() || undefined,
          usp: f.usp.trim() || undefined,
          brandVoice: f.brandVoice.trim() || undefined,
          goals: f.goals.trim() || undefined,
        },
      });
      await mutate("/api/clients");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create client.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="glass p-6">
      <h2 className="mb-1 text-lg font-medium">New client</h2>
      <p className="mb-5 text-sm text-muted">
        The brand context tailors every AI recommendation to this client.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Client name *">
          <input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Acme Skincare" />
        </Field>
        <Field label="Facebook page name" hint="As it appears in the Ad Library — used to scrape their own ads">
          <input className="input" value={f.fbPageName} onChange={(e) => set("fbPageName", e.target.value)} placeholder="Acme Skincare" />
        </Field>
        <Field label="Industry">
          <input className="input" value={f.industry} onChange={(e) => set("industry", e.target.value)} placeholder="D2C / Skincare" />
        </Field>
        <Field label="Target audience">
          <input className="input" value={f.targetAudience} onChange={(e) => set("targetAudience", e.target.value)} placeholder="Women 25-40, metro India" />
        </Field>
        <Field label="USP / value prop">
          <input className="input" value={f.usp} onChange={(e) => set("usp", e.target.value)} placeholder="Dermatologist-tested, ₹-friendly" />
        </Field>
        <Field label="Brand voice">
          <input className="input" value={f.brandVoice} onChange={(e) => set("brandVoice", e.target.value)} placeholder="Warm, expert, no jargon" />
        </Field>
        <Field label="Goals">
          <input className="input" value={f.goals} onChange={(e) => set("goals", e.target.value)} placeholder="Grow online sales 30%" />
        </Field>
        <Field label="Competitors" hint="Comma-separated brand names">
          <input className="input" value={f.competitors} onChange={(e) => set("competitors", e.target.value)} placeholder="Mamaearth, Plum, Minimalist" />
        </Field>
      </div>

      {error && <p className="mt-4 text-sm text-behind">{error}</p>}

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" className="btn-ghost" onClick={onDone} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Create client
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label mb-1.5 block">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted/70">{hint}</span>}
    </label>
  );
}
