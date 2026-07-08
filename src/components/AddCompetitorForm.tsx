"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { Plus, Loader2 } from "lucide-react";
import { postJSON } from "@/lib/client";

/** Inline "add a competitor" control on the client detail page. */
export default function AddCompetitorForm({ clientId }: { clientId: string }) {
  const { mutate } = useSWRConfig();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await postJSON(`/api/clients/${clientId}/competitors`, { name: name.trim() });
      setName("");
      await mutate(`/api/clients/${clientId}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={add} className="flex items-center gap-2">
      <input
        className="input h-9 w-44 py-1.5"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Add competitor…"
      />
      <button className="btn-ghost h-9 px-3 py-1.5" disabled={busy || !name.trim()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      </button>
    </form>
  );
}
