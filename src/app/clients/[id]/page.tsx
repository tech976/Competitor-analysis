"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import {
  ArrowLeft,
  Trash2,
  Swords,
  Megaphone,
  Trophy,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import type { ClientDetail, AdLite, CompetitorLite } from "@/lib/api-types";
import { del } from "@/lib/client";
import { FadeIn } from "@/components/ui/motion";
import { GradientText } from "@/components/ui/GradientText";
import RunScanButton from "@/components/RunScanButton";
import AddCompetitorForm from "@/components/AddCompetitorForm";
import ComparisonView from "@/components/ComparisonView";
import AdCard from "@/components/AdCard";
import PageResolver, { type ResolverTarget } from "@/components/PageResolver";
import DiscoverCompetitors from "@/components/DiscoverCompetitors";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading } = useSWR<{ client: ClientDetail }>(
    id ? `/api/clients/${id}` : null
  );
  const { data: clientAds } = useSWR<{ ads: AdLite[] }>(
    id ? `/api/ads?clientId=${id}&type=CLIENT` : null
  );
  const { data: winners } = useSWR<{ ads: AdLite[] }>(
    id ? `/api/ads?clientId=${id}&type=COMPETITOR&winnersOnly=1` : null
  );

  const [resolver, setResolver] = useState<ResolverTarget | null>(null);
  const [showDiscover, setShowDiscover] = useState(false);

  const client = data?.client;
  const comparison = client?.scanRuns[0]?.comparison ?? null;

  async function remove() {
    if (!client) return;
    if (!confirm(`Delete ${client.name}? This purges all of its data.`)) return;
    await del(`/api/clients/${id}`);
    router.push("/");
  }

  if (isLoading) {
    return <div className="glass mx-auto h-40 max-w-5xl animate-pulse" />;
  }
  if (!client) {
    return (
      <div className="mx-auto max-w-5xl">
        <p className="text-muted">Client not found.</p>
        <Link href="/" className="mt-2 inline-block text-accent-soft">
          ← Back
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" /> Clients
      </Link>

      {/* Header */}
      <FadeIn className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            <GradientText>{client.name}</GradientText>
          </h1>
          <p className="mt-1 text-sm text-muted">
            {client.context?.industry ?? "No industry set"}
            {client.context?.targetAudience ? ` · ${client.context.targetAudience}` : ""}
          </p>
          <button
            onClick={() =>
              setResolver({
                kind: "client",
                id: client.id,
                clientId: client.id,
                currentName: client.fbPageName ?? client.name,
              })
            }
            className="mt-2 inline-flex items-center gap-1.5 text-xs"
          >
            {client.fbPageId ? (
              <span className="inline-flex items-center gap-1 text-lead">
                <CheckCircle2 className="h-3.5 w-3.5" /> {client.fbPageName ?? "Page set"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-par">
                <AlertTriangle className="h-3.5 w-3.5" /> No exact page set
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-muted underline">
              <MapPin className="h-3 w-3" /> set page
            </span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/clients/${client.id}/compare`} className="btn-ghost h-9 px-3">
            <Swords className="h-4 w-4" /> 1-to-1 Compare
          </Link>
          <RunScanButton clientId={client.id} />
          <button
            onClick={remove}
            className="btn-ghost h-9 px-3 text-behind hover:bg-behind/10"
            title="Offboard client (purge all data)"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </FadeIn>

      {/* Competitors */}
      <FadeIn delay={0.05} className="glass mb-8 flex flex-wrap items-center gap-3 p-4">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
          <Swords className="h-4 w-4 text-accent-soft" /> Competitors
        </span>
        {client.competitors.length === 0 && (
          <span className="text-sm text-muted">None yet — add a few to compare.</span>
        )}
        {client.competitors.map((c) => (
          <button
            key={c.id}
            onClick={() =>
              setResolver({
                kind: "competitor",
                id: c.id,
                clientId: client.id,
                currentName: c.fbPageName ?? c.name,
              })
            }
            title={c.fbPageId ? `Exact page: ${c.fbPageName}` : "No exact page set — click to fix accuracy"}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2/60 px-3 py-1 text-xs hover:bg-surface-2"
          >
            {c.fbPageId ? (
              <CheckCircle2 className="h-3 w-3 text-lead" />
            ) : (
              <AlertTriangle className="h-3 w-3 text-par" />
            )}
            {c.name}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button
            className="btn-ghost h-9 px-3 text-xs"
            onClick={() => setShowDiscover(true)}
            title="Let AI suggest the closest competitors"
          >
            <Sparkles className="h-4 w-4 text-accent-soft" /> Discover
          </button>
          <AddCompetitorForm clientId={client.id} />
        </div>
      </FadeIn>

      {(client.competitors.some((c) => !c.fbPageId) || !client.fbPageId) && (
        <FadeIn delay={0.06} className="mb-8 flex items-center gap-2 rounded-lg border border-par/30 bg-par/10 px-4 py-2.5 text-xs text-par">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          For accurate results, set each brand&apos;s exact Facebook page (click a name above).
          Scraping by name alone can pull in unrelated advertisers.
        </FadeIn>
      )}

      {/* Comparison or empty state */}
      {comparison ? (
        <ComparisonView c={comparison} />
      ) : (
        <FadeIn className="glass mb-8 grid place-items-center px-6 py-14 text-center">
          <Megaphone className="mb-3 h-8 w-8 text-accent-soft" />
          <p className="text-base font-medium">No comparison yet</p>
          <p className="mt-1 max-w-md text-sm text-muted">
            Add competitors and hit <span className="text-fg">Run scan</span> to pull their
            Meta ads, find their winners, and generate your marketing-angle gap analysis.
          </p>
        </FadeIn>
      )}

      {/* Ad galleries */}
      <AdGallery
        title="Competitor winning ads"
        icon={<Trophy className="h-4 w-4 text-amber-300" />}
        ads={winners?.ads ?? []}
        empty="Run a scan to surface competitors' proven winners."
      />
      <AdGallery
        title="Your client's ads"
        icon={<Megaphone className="h-4 w-4 text-accent-soft" />}
        ads={clientAds?.ads ?? []}
        empty="No ads scraped for this client yet."
      />

      {resolver && <PageResolver target={resolver} onClose={() => setResolver(null)} />}
      {showDiscover && (
        <DiscoverCompetitors clientId={client.id} onClose={() => setShowDiscover(false)} />
      )}
    </div>
  );
}

function AdGallery({
  title,
  icon,
  ads,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  ads: AdLite[];
  empty: string;
}) {
  return (
    <section className="mt-10">
      <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-fg/90">
        {icon} {title}
        <span className="text-xs font-normal text-muted">({ads.length})</span>
      </h3>
      {ads.length === 0 ? (
        <p className="glass-2 px-4 py-6 text-center text-sm text-muted">{empty}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {ads.map((ad, i) => (
            <FadeIn key={ad.id} delay={i * 0.03}>
              <AdCard ad={ad} />
            </FadeIn>
          ))}
        </div>
      )}
    </section>
  );
}
