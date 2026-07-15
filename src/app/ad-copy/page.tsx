"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  PenLine,
  Sparkles,
  Globe,
  Target,
  Copy,
  Check,
  Swords,
  Lightbulb,
  Loader2,
  Wand2,
  History,
} from "lucide-react";
import type {
  ClientListItem,
  AdCopyResultLite,
  AdCopyRunFull,
  AdCopyRunSummary,
  CompetitorIntelLite,
  HeadlineGroupLite,
  AdConceptLite,
  ClientDossierLite,
} from "@/lib/api-types";
import { FadeIn } from "@/components/ui/motion";
import { GradientText } from "@/components/ui/GradientText";
import { postJSON } from "@/lib/client";

const STEPS = [
  "Reading your client's website & the live web…",
  "Building the client dossier (USP, audience, proof)…",
  "Researching the closest competitors…",
  "Studying competitors' real ad copy & angles…",
  "Writing headlines engineered to beat them…",
];

export default function AdCopyPage() {
  const { data: clientsData } = useSWR<{ clients: ClientListItem[] }>("/api/clients");
  const clients = clientsData?.clients ?? [];

  const [clientId, setClientId] = useState<string>("");
  const [website, setWebsite] = useState("");
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdCopyResultLite | null>(null);

  // Past runs for the selected client (+ latest full run to show immediately).
  const { data: history, mutate: refetchHistory } = useSWR<{
    runs: AdCopyRunSummary[];
    latest: AdCopyRunFull | null;
  }>(clientId ? `/api/ad-copy?clientId=${clientId}` : null);

  // When switching client, surface the last successful run (no re-spend).
  useEffect(() => {
    setError(null);
    if (history?.latest?.output && history.latest.clientDossier) {
      setResult({
        runId: history.latest.id,
        clientDossier: history.latest.clientDossier,
        output: history.latest.output,
      });
    } else {
      setResult(null);
    }
  }, [history?.latest, clientId]);

  // Cycle the progress copy while generating.
  useEffect(() => {
    if (!busy) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 6000);
    return () => clearInterval(t);
  }, [busy]);

  async function generate() {
    if (!clientId || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await postJSON<AdCopyResultLite>("/api/ad-copy", {
        clientId,
        website: website.trim() || undefined,
        goal: goal.trim() || undefined,
      });
      setResult(res);
      refetchHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }

  const selected = clients.find((c) => c.id === clientId);

  return (
    <div className="mx-auto max-w-5xl pb-16">
      <FadeIn className="mb-6">
        <h1 className="inline-flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <PenLine className="h-7 w-7 text-accent-soft" />
          <GradientText>Ad Copy</GradientText> Studio
        </h1>
        <p className="mt-1 text-sm text-muted">
          Deep-research your client and their closest competitors, then generate
          headlines engineered to beat them — as a creative + competitor analyst.
        </p>
      </FadeIn>

      {/* Controls */}
      <FadeIn className="glass mb-6 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">
              <Sparkles className="h-3.5 w-3.5" /> Client
            </span>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c._count.competitors} competitors
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">
              <Globe className="h-3.5 w-3.5" /> Client website{" "}
              <span className="text-muted/60">(optional, improves research)</span>
            </span>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://clientbrand.com"
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">
            <Target className="h-3.5 w-3.5" /> Campaign goal / brief{" "}
            <span className="text-muted/60">(optional)</span>
          </span>
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Diwali sale push for premium skincare line, drive add-to-carts"
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted">
            {selected
              ? `Researches ~6 closest competitors + their real ads. Takes ~1–2 min.`
              : "Pick a client to begin."}
          </p>
          <button
            onClick={generate}
            disabled={!clientId || busy}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-glow transition enabled:hover:brightness-110 disabled:opacity-40"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            {busy ? "Researching…" : result ? "Regenerate" : "Research & generate"}
          </button>
        </div>
      </FadeIn>

      {/* Progress */}
      {busy && (
        <FadeIn className="glass-2 mb-6 flex items-center gap-3 px-5 py-4">
          <Loader2 className="h-4 w-4 animate-spin text-accent-soft" />
          <p className="text-sm text-white/90">{STEPS[step]}</p>
        </FadeIn>
      )}

      {error && (
        <FadeIn className="glass-2 mb-6 border border-behind/30 px-5 py-4">
          <p className="text-sm text-behind">{error}</p>
        </FadeIn>
      )}

      {result && !busy && (
        <Results result={result} />
      )}

      {/* History */}
      {history?.runs && history.runs.length > 1 && (
        <FadeIn className="mt-8">
          <h3 className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
            <History className="h-3.5 w-3.5" /> Past runs
          </h3>
          <div className="space-y-1.5">
            {history.runs.map((r) => (
              <button
                key={r.id}
                onClick={() => loadRun(r.id, setResult, setError, setBusy)}
                className="glass-2 flex w-full items-center justify-between px-4 py-2.5 text-left text-xs transition hover:bg-surface-2/40"
              >
                <span className="truncate">
                  {r.goal || "General ad copy"}{" "}
                  <span className="text-muted">· {new Date(r.createdAt).toLocaleString()}</span>
                </span>
                <span
                  className={
                    r.status === "SUCCEEDED"
                      ? "text-lead"
                      : r.status === "FAILED"
                      ? "text-behind"
                      : "text-muted"
                  }
                >
                  {r.status === "SUCCEEDED" ? `${r.headlineCount} headlines` : r.status}
                </span>
              </button>
            ))}
          </div>
        </FadeIn>
      )}
    </div>
  );
}

async function loadRun(
  runId: string,
  setResult: (r: AdCopyResultLite | null) => void,
  setError: (e: string | null) => void,
  setBusy: (b: boolean) => void
) {
  setBusy(true);
  setError(null);
  try {
    const r = await fetch(`/api/ad-copy?runId=${runId}`).then((x) => x.json());
    const run: AdCopyRunFull = r.run;
    if (run?.output && run.clientDossier) {
      setResult({ runId: run.id, clientDossier: run.clientDossier, output: run.output });
    } else {
      setError(run?.error || "This run has no output.");
    }
  } catch {
    setError("Could not load that run.");
  } finally {
    setBusy(false);
  }
}

// ── Results ──────────────────────────────────────────────────────────────────

function Results({ result }: { result: AdCopyResultLite }) {
  const { clientDossier, output } = result;
  const totalHeadlines = useMemo(
    () => output.headlineGroups.reduce((n, g) => n + (g.headlines?.length ?? 0), 0),
    [output.headlineGroups]
  );

  return (
    <div className="space-y-6">
      {/* Strategy */}
      <FadeIn className="glass p-5">
        <h2 className="mb-2 inline-flex items-center gap-2 text-sm font-semibold">
          <Lightbulb className="h-4 w-4 text-accent-soft" /> Creative strategy
        </h2>
        <p className="text-sm text-white/90">{output.strategy.summary}</p>
        {output.strategy.positioningVsCompetitors && (
          <p className="mt-2 text-sm text-muted">
            <span className="font-medium text-white/80">Positioning:</span>{" "}
            {output.strategy.positioningVsCompetitors}
          </p>
        )}
        {output.strategy.whitespace?.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-xs font-medium text-muted">
              Whitespace competitors aren&apos;t using
            </p>
            <div className="flex flex-wrap gap-1.5">
              {output.strategy.whitespace.map((w, i) => (
                <span
                  key={i}
                  className="rounded-full bg-lead/10 px-2.5 py-1 text-xs text-lead"
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}
      </FadeIn>

      <ClientDossierCard dossier={clientDossier} />

      {/* Headlines */}
      <div>
        <h2 className="mb-3 inline-flex items-center gap-2 text-lg font-semibold">
          <PenLine className="h-5 w-5 text-accent-soft" /> Headlines
          <span className="text-xs font-normal text-muted">
            ({totalHeadlines} across {output.headlineGroups.length} angles)
          </span>
        </h2>
        <div className="space-y-4">
          {output.headlineGroups.map((g, i) => (
            <HeadlineGroupCard key={i} group={g} delay={i * 0.04} />
          ))}
        </div>
      </div>

      {/* Concepts */}
      {output.concepts.length > 0 && (
        <div>
          <h2 className="mb-3 inline-flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-accent-soft" /> Full ad concepts
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {output.concepts.map((c, i) => (
              <ConceptCard key={i} concept={c} delay={i * 0.04} />
            ))}
          </div>
        </div>
      )}

      {/* Competitor intel */}
      {output.competitorIntel.length > 0 && (
        <div>
          <h2 className="mb-3 inline-flex items-center gap-2 text-lg font-semibold">
            <Swords className="h-5 w-5 text-accent-soft" /> Competitor intelligence
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {output.competitorIntel.map((c, i) => (
              <CompetitorCard key={i} intel={c} delay={i * 0.04} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClientDossierCard({ dossier }: { dossier: ClientDossierLite }) {
  const row = (label: string, val: string) =>
    val ? (
      <div>
        <span className="text-xs font-medium text-muted">{label}</span>
        <p className="text-sm text-white/90">{val}</p>
      </div>
    ) : null;
  return (
    <FadeIn className="glass p-5">
      <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold">
        <Target className="h-4 w-4 text-accent-soft" /> Client dossier
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {row("What they do", dossier.oneLiner)}
        {row("USP", dossier.usp)}
        {row("Audience", dossier.audience)}
        {row("Positioning", `${dossier.positioning}${dossier.priceTier ? ` · ${dossier.priceTier}` : ""}`)}
        {row("Voice", dossier.tone)}
        {dossier.offerings?.length ? row("Offerings", dossier.offerings.join(", ")) : null}
      </div>
      {dossier.proofPoints?.length > 0 && (
        <div className="mt-3">
          <span className="text-xs font-medium text-muted">Proof points</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {dossier.proofPoints.map((p, i) => (
              <span key={i} className="rounded-full bg-surface-2/60 px-2.5 py-1 text-xs text-white/80">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
    </FadeIn>
  );
}

function HeadlineGroupCard({ group, delay }: { group: HeadlineGroupLite; delay: number }) {
  return (
    <FadeIn delay={delay} className="glass p-5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-white">{group.angle}</h3>
        {group.intent && <p className="text-xs text-muted">{group.intent}</p>}
      </div>
      <div className="space-y-1.5">
        {group.headlines?.map((h, i) => (
          <HeadlineRow key={i} text={h.text} rationale={h.rationale} />
        ))}
      </div>
    </FadeIn>
  );
}

function HeadlineRow({ text, rationale }: { text: string; rationale: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group flex items-start gap-2 rounded-lg px-2 py-1.5 transition hover:bg-surface-2/40">
      <button
        onClick={() => {
          navigator.clipboard?.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        }}
        title="Copy headline"
        className="mt-0.5 shrink-0 text-muted transition hover:text-accent-soft"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-lead" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <div className="min-w-0">
        <p className="text-sm text-white/95">{text}</p>
        {rationale && <p className="text-[11px] text-muted">{rationale}</p>}
      </div>
    </div>
  );
}

function ConceptCard({ concept, delay }: { concept: AdConceptLite; delay: number }) {
  const [copied, setCopied] = useState(false);
  const full = `${concept.headline}\n\n${concept.primaryText}\n\n${concept.cta}`;
  return (
    <FadeIn delay={delay} className="glass-2 flex flex-col p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent-soft">
          {concept.angle}
        </span>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(full);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
          className="text-muted transition hover:text-accent-soft"
          title="Copy full concept"
        >
          {copied ? <Check className="h-4 w-4 text-lead" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <p className="text-sm font-semibold text-white">{concept.headline}</p>
      <p className="mt-1.5 flex-1 text-xs text-white/80">{concept.primaryText}</p>
      <p className="mt-2 text-xs font-medium text-accent-soft">{concept.cta}</p>
      {concept.whyItBeatsCompetitors && (
        <p className="mt-2 border-t border-border pt-2 text-[11px] text-muted">
          {concept.whyItBeatsCompetitors}
        </p>
      )}
    </FadeIn>
  );
}

function CompetitorCard({ intel, delay }: { intel: CompetitorIntelLite; delay: number }) {
  const chips = (label: string, items: string[], tone: string) =>
    items?.length ? (
      <div className="mt-2">
        <span className="text-[11px] font-medium text-muted">{label}</span>
        <div className="mt-1 flex flex-wrap gap-1">
          {items.map((x, i) => (
            <span key={i} className={`rounded px-1.5 py-0.5 text-[11px] ${tone}`}>
              {x}
            </span>
          ))}
        </div>
      </div>
    ) : null;
  return (
    <FadeIn delay={delay} className="glass-2 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{intel.name}</h3>
        <span className="text-[10px] text-muted">
          {intel.priceTier} · close {intel.closeness}/10
        </span>
      </div>
      {intel.positioning && <p className="mt-1 text-xs text-white/80">{intel.positioning}</p>}
      {chips("Angles", intel.angles, "bg-surface-2/60 text-white/80")}
      {chips("Hooks", intel.hooks, "bg-accent/10 text-accent-soft")}
      {chips("Offers", intel.offers, "bg-lead/10 text-lead")}
      {chips("Weaknesses to exploit", intel.weaknesses, "bg-behind/10 text-behind")}
    </FadeIn>
  );
}
