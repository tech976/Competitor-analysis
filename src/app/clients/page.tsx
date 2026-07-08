"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus } from "lucide-react";
import type { ClientListItem } from "@/lib/api-types";
import { FadeIn } from "@/components/ui/motion";
import { GradientText } from "@/components/ui/GradientText";
import ClientCard from "@/components/ClientCard";
import NewClientForm from "@/components/NewClientForm";

export default function ClientsPage() {
  const { data, isLoading } = useSWR<{ clients: ClientListItem[] }>("/api/clients");
  const [adding, setAdding] = useState(false);
  const clients = data?.clients ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <FadeIn className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            <GradientText>Clients</GradientText>
          </h1>
          <p className="mt-1 text-sm text-muted">
            Pick a client, add their rivals, and run an ad-gap scan.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setAdding((v) => !v)}>
          <Plus className="h-4 w-4" /> New client
        </button>
      </FadeIn>

      {adding && (
        <FadeIn className="mb-8">
          <NewClientForm onDone={() => setAdding(false)} />
        </FadeIn>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass h-44 animate-pulse" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <FadeIn className="glass grid place-items-center px-6 py-20 text-center">
          <p className="text-lg font-medium">No clients yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Add your first client and a few competitors to run your first ad-gap scan.
          </p>
          <button className="btn-primary mt-5" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add a client
          </button>
        </FadeIn>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c, i) => (
            <FadeIn key={c.id} delay={i * 0.05}>
              <ClientCard client={c} />
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  );
}
