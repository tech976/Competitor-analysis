"use client";

import useSWR from "swr";
import {
  Settings as SettingsIcon,
  Plug,
  Sparkles,
  SlidersHorizontal,
  Building2,
  Check,
  X,
} from "lucide-react";
import { FadeIn } from "@/components/ui/motion";
import { GradientText } from "@/components/ui/GradientText";
import { cn } from "@/lib/cn";

interface SettingsData {
  integrations: {
    apify: boolean;
    groq: boolean;
    gemini: boolean;
    anthropic: boolean;
    llm: boolean;
  };
  llm: {
    activeProvider: "groq" | "gemini" | "anthropic" | null;
    geminiModel: string;
    geminiKeyCount: number;
    anthropicModel: string;
    groqModel: string;
  };
  tuning: {
    winnerDaysThreshold: number;
    scanResultsLimit: number;
    pricePer1kAds: number;
  };
  workspace: {
    agency: string | null;
    clients: number;
    competitors: number;
    ads: number;
    scans: number;
  };
}

export default function SettingsPage() {
  const { data, isLoading } = useSWR<SettingsData>("/api/settings");

  return (
    <div className="mx-auto max-w-4xl pb-16">
      <FadeIn className="mb-6">
        <h1 className="inline-flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <SettingsIcon className="h-7 w-7 text-accent-soft" />
          <GradientText>Settings</GradientText>
        </h1>
        <p className="mt-1 text-sm text-muted">
          System status and configuration. Keys &amp; tuning are set via environment
          variables (<code className="text-white/70">.env</code> locally, Vercel in
          production).
        </p>
      </FadeIn>

      {isLoading || !data ? (
        <div className="glass h-72 animate-pulse" />
      ) : (
        <div className="space-y-5">
          {/* Integrations */}
          <FadeIn className="glass p-5">
            <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-semibold">
              <Plug className="h-4 w-4 text-accent-soft" /> Integrations
            </h2>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <StatusRow label="Apify · Ad Library scraping" on={data.integrations.apify} />
              <StatusRow label="Gemini · Research + vision" on={data.integrations.gemini} />
              <StatusRow label="Groq · Analysis LLM" on={data.integrations.groq} />
              <StatusRow label="Anthropic · Fallback LLM" on={data.integrations.anthropic} />
            </div>
            {!data.integrations.llm && (
              <p className="mt-3 text-xs text-behind">
                No AI provider configured — analysis and ad copy are disabled until a
                Gemini or Groq key is set.
              </p>
            )}
          </FadeIn>

          {/* AI engine */}
          <FadeIn className="glass p-5">
            <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-accent-soft" /> AI engine
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Active provider" value={data.llm.activeProvider ?? "none"} highlight />
              <Stat label="Gemini model" value={data.llm.geminiModel} />
              <Stat
                label="Gemini keys"
                value={`${data.llm.geminiKeyCount} configured`}
                hint={data.llm.geminiKeyCount > 1 ? "rotated on quota" : undefined}
              />
            </div>
          </FadeIn>

          {/* Scan tuning */}
          <FadeIn className="glass p-5">
            <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-semibold">
              <SlidersHorizontal className="h-4 w-4 text-accent-soft" /> Scan tuning
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat
                label="Winner day threshold"
                value={`${data.tuning.winnerDaysThreshold} days`}
                hint="≈50% longevity score"
              />
              <Stat label="Results per advertiser" value={String(data.tuning.scanResultsLimit)} />
              <Stat label="Est. cost / 1k ads" value={`$${data.tuning.pricePer1kAds}`} />
            </div>
          </FadeIn>

          {/* Workspace */}
          <FadeIn className="glass p-5">
            <h2 className="mb-4 inline-flex items-center gap-2 text-sm font-semibold">
              <Building2 className="h-4 w-4 text-accent-soft" /> Workspace
            </h2>
            <div className="grid gap-3 sm:grid-cols-4">
              <Stat label="Agency" value={data.workspace.agency ?? "—"} />
              <Stat label="Clients" value={String(data.workspace.clients)} />
              <Stat label="Competitors" value={String(data.workspace.competitors)} />
              <Stat label="Ads tracked" value={data.workspace.ads.toLocaleString()} />
            </div>
          </FadeIn>
        </div>
      )}
    </div>
  );
}

function StatusRow({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="glass-2 flex items-center gap-2.5 px-3 py-2.5">
      <span
        className={cn(
          "grid h-5 w-5 shrink-0 place-items-center rounded-full",
          on ? "bg-lead/15 text-lead" : "bg-border/40 text-muted"
        )}
      >
        {on ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      </span>
      <span className="text-sm text-white/85">{label}</span>
      <span className={cn("ml-auto text-[10px]", on ? "text-lead" : "text-muted")}>
        {on ? "ready" : "off"}
      </span>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div className="glass-2 px-3 py-3">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p className={cn("mt-0.5 text-sm font-semibold", highlight ? "text-accent-soft capitalize" : "text-white")}>
        {value}
      </p>
      {hint && <p className="text-[10px] text-muted">{hint}</p>}
    </div>
  );
}
