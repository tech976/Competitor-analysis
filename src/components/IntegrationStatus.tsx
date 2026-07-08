"use client";

import useSWR from "swr";
import { cn } from "@/lib/cn";

interface Integrations {
  apify: boolean;
  groq: boolean;
  gemini: boolean;
  llm: boolean;
}

const ROWS: Array<{ key: keyof Integrations; label: string }> = [
  { key: "apify", label: "Apify · Ad Library" },
  { key: "groq", label: "Groq · Analysis" },
  { key: "gemini", label: "Gemini · Video" },
];

export default function IntegrationStatus() {
  const { data } = useSWR<Integrations>("/api/integrations");

  return (
    <div className="glass-2 px-3 py-3">
      <p className="label mb-2">Integrations</p>
      <ul className="space-y-1.5">
        {ROWS.map(({ key, label }) => {
          const on = data?.[key];
          return (
            <li key={key} className="flex items-center gap-2 text-xs text-white/80">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  on ? "bg-lead shadow-[0_0_8px_#34d399]" : "bg-border"
                )}
              />
              {label}
              <span className="ml-auto text-[10px] text-muted">
                {on ? "ready" : "off"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
