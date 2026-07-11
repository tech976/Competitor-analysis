import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { completeJson, llmConfigured } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DIM_LABELS: Record<string, string> = {
  AD_VOLUME: "Ad volume",
  PROVEN_WINNERS: "Proven winners",
  FORMAT_MIX: "Format mix",
  CREATIVE_QUALITY: "Creative quality",
  HOOK: "Hook",
  ON_SCREEN_TEXT: "On-screen text",
  OFFER_CLARITY: "Offer clarity",
  CTA: "Call to action",
  MESSAGING_ANGLES: "Messaging angles",
  EMOTIONAL_APPEAL: "Emotional appeal",
  SOCIAL_PROOF: "Social proof",
  CREATIVE_FRESHNESS: "Creative freshness",
};

interface AiInsights {
  headline: string;
  patterns: string[];
  gaps: string[];
  recommendations: string[];
}

/** Cross-scan intelligence: what wins, and where clients most often lag. */
export async function GET() {
  const [winners, dims] = await Promise.all([
    prisma.ad.findMany({
      where: { advertiserType: "COMPETITOR", isProvenWinner: true },
      orderBy: { winningScore: "desc" },
      take: 40,
    }),
    prisma.comparisonDimension.findMany({ take: 800 }),
  ]);

  // Aspects clients are most often BEHIND on.
  const behind = new Map<string, number>();
  for (const d of dims) if (d.mark === "BEHIND") behind.set(d.dimension, (behind.get(d.dimension) ?? 0) + 1);
  const topBehind = [...behind.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([dim, count]) => ({ label: DIM_LABELS[dim] ?? dim, count }));

  // Winner format mix + average longevity.
  const formats = new Map<string, number>();
  for (const w of winners) formats.set(w.mediaType, (formats.get(w.mediaType) ?? 0) + 1);
  const avgDaysLive = winners.length
    ? Math.round(winners.reduce((s, w) => s + (w.daysLiveLatest ?? 0), 0) / winners.length)
    : 0;

  const stats = {
    winnerCount: winners.length,
    formats: [...formats.entries()].map(([format, count]) => ({ format, count })).sort((a, b) => b.count - a.count),
    avgDaysLive,
    topBehind,
  };

  let ai: AiInsights | null = null;
  if (llmConfigured() && winners.length > 0) {
    const payload = {
      winners: winners.slice(0, 25).map((w) => ({
        brand: w.advertiserName,
        format: w.mediaType,
        daysLive: w.daysLiveLatest,
        headline: w.headline,
        copy: w.primaryText?.slice(0, 160) ?? null,
        cta: w.ctaText,
      })),
      clientsMostBehindOn: topBehind.map((t) => t.label),
    };
    const prompt = `You are a performance-marketing strategist. From these competitor WINNING ads (long-running, scaled) and the aspects our clients most often lose on, surface the cross-scan patterns worth acting on.

DATA: ${JSON.stringify(payload)}

Return JSON: { "headline": "one punchy takeaway", "patterns": ["3-5 recurring winning patterns/formulas in the market"], "gaps": ["3-4 aspects our clients most need to fix"], "recommendations": ["3-5 do-now moves"] }
JSON only.`;
    try {
      ai = await completeJson<AiInsights>(prompt, { maxTokens: 1500 });
    } catch {
      ai = null;
    }
  }

  return NextResponse.json({ stats, ai });
}
