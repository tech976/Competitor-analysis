"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Swords,
  ScanLine,
  GitCompareArrows,
  Trophy,
  PenLine,
  Lightbulb,
  Bell,
  FileText,
  Settings,
  Sparkles,
} from "lucide-react";
import { GradientText } from "@/components/ui/GradientText";
import IntegrationStatus from "@/components/IntegrationStatus";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/clients", label: "Clients", Icon: Users },
  { href: "/competitors", label: "Competitors", Icon: Swords },
  { href: "/scans", label: "Ad Scans", Icon: ScanLine },
  { href: "/compare", label: "Ad Comparison", Icon: GitCompareArrows },
  { href: "/winning-ads", label: "Winning Ads", Icon: Trophy },
  { href: "/ad-copy", label: "Ad Copy", Icon: PenLine },
  { href: "/insights", label: "Insights", Icon: Lightbulb },
  { href: "/alerts", label: "Alerts", Icon: Bell },
  { href: "/reports", label: "Reports", Icon: FileText },
  { href: "/settings", label: "Settings", Icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface/40 px-3 py-5 backdrop-blur-xl md:flex">
      <Link href="/" className="mb-7 flex items-center gap-2 px-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-accent shadow-glow">
          <Sparkles className="h-5 w-5" />
        </span>
        <span className="text-lg font-semibold tracking-tight">
          <GradientText>AdGap</GradientText>IQ
        </span>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-accent/15 text-white shadow-glow"
                  : "text-muted hover:bg-surface-2/60 hover:text-white/90"
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <IntegrationStatus />
        <CreditsWidget />
      </div>
    </aside>
  );
}

function CreditsWidget() {
  const used = 3200;
  const total = 10000;
  const pct = Math.round((used / total) * 100);
  return (
    <div className="glass-2 px-3 py-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-accent-soft" /> Pro Plan
        </span>
        <span className="text-[10px] text-muted">scan credits</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-canvas">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] text-muted">
        {used.toLocaleString()} / {total.toLocaleString()} credits
      </p>
    </div>
  );
}
