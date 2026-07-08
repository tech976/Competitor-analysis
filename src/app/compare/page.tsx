"use client";

import useSWR from "swr";
import Link from "next/link";
import { GitCompareArrows, ArrowRight } from "lucide-react";
import type { ClientListItem } from "@/lib/api-types";
import { FadeIn } from "@/components/ui/motion";
import { GradientText } from "@/components/ui/GradientText";

export default function ComparePickerPage() {
  const { data } = useSWR<{ clients: ClientListItem[] }>("/api/clients");
  const clients = data?.clients ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <FadeIn className="mb-6">
        <h1 className="inline-flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <GitCompareArrows className="h-7 w-7 text-accent-soft" />
          <GradientText>Ad</GradientText> Comparison
        </h1>
        <p className="mt-1 text-sm text-muted">
          Pick a client to compare its ads against competitors&apos; winners.
        </p>
      </FadeIn>

      {clients.length === 0 ? (
        <p className="glass px-6 py-16 text-center text-sm text-muted">
          No clients yet. Add one from the Clients page first.
        </p>
      ) : (
        <div className="space-y-3">
          {clients.map((c, i) => (
            <FadeIn key={c.id} delay={i * 0.04}>
              <Link
                href={`/clients/${c.id}/compare`}
                className="glass flex items-center justify-between px-5 py-4 transition hover:bg-surface-2/40"
              >
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted">
                    {c._count.competitors} competitors · {c._count.ads} ads
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-accent-soft" />
              </Link>
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  );
}
