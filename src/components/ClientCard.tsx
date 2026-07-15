import Link from "next/link";
import { ArrowRight, Swords, Megaphone } from "lucide-react";
import type { ClientListItem } from "@/lib/api-types";
import SpotlightCard from "@/components/ui/SpotlightCard";
import { cn } from "@/lib/cn";

const STATUS: Record<string, string> = {
  SUCCEEDED: "text-lead bg-lead/10 border-lead/30",
  RUNNING: "text-par bg-par/10 border-par/30",
  PENDING: "text-muted bg-surface-2 border-border",
  FAILED: "text-behind bg-behind/10 border-behind/30",
};

export default function ClientCard({ client }: { client: ClientListItem }) {
  const lastScan = client.scanRuns[0];

  return (
    <Link href={`/clients/${client.id}`} className="block">
      <SpotlightCard className="h-full p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">{client.name}</h3>
            <p className="text-xs text-muted">
              {client.context?.industry ?? "No industry set"}
            </p>
          </div>
          {lastScan && (
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                STATUS[lastScan.status] ?? STATUS.PENDING
              )}
            >
              {lastScan.status.toLowerCase()}
            </span>
          )}
        </div>

        <div className="mt-5 flex items-center gap-4 text-sm text-fg/80">
          <span className="inline-flex items-center gap-1.5">
            <Swords className="h-4 w-4 text-accent-soft" />
            {client._count.competitors} rivals
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Megaphone className="h-4 w-4 text-accent-soft" />
            {client._count.ads} ads
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
          <span className="text-muted">
            {lastScan
              ? `Last scan · ${new Date(lastScan.startedAt).toLocaleDateString()}`
              : "Not scanned yet"}
          </span>
          <span className="inline-flex items-center gap-1 text-accent-soft transition group-hover:gap-2">
            Open <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </SpotlightCard>
    </Link>
  );
}
