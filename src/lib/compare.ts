/**
 * Comparison synthesis (Claude). Takes a finished scan, compares the client's
 * ads against the competitors' proven winners, and produces — in MARKETING
 * language — per-aspect cards, a 1–10 rating per competitor, an overall
 * summary, and a sales-growth action plan. Persists it as a `Comparison`.
 *
 * Gated on the Anthropic key; returns null if AI isn't configured.
 */
import { prisma } from "./db";
import { completeJson, llmConfigured } from "./llm";

const DIMENSIONS = [
  "AD_VOLUME",
  "PROVEN_WINNERS",
  "FORMAT_MIX",
  "CREATIVE_QUALITY",
  "HOOK",
  "ON_SCREEN_TEXT",
  "OFFER_CLARITY",
  "CTA",
  "MESSAGING_ANGLES",
  "EMOTIONAL_APPEAL",
  "SOCIAL_PROOF",
  "CREATIVE_FRESHNESS",
] as const;
type Dimension = (typeof DIMENSIONS)[number];

interface AIResult {
  gapScore: number;
  tldr: string;
  overallSummary: string;
  lackingSummary: string;
  salesGrowthPlan: string;
  suggestions: string;
  competitors: Array<{
    name: string;
    rating: number;
    summary: string;
    topStrength: string;
  }>;
  dimensions: Array<{
    dimension: string;
    clientScore: number;
    competitorBestScore: number;
    mark: "LEAD" | "PAR" | "BEHIND";
    reasoning: string;
    fix: string;
  }>;
}

export async function buildComparison(scanRunId: string): Promise<string | null> {
  if (!llmConfigured()) return null;

  const run = await prisma.scanRun.findUnique({
    where: { id: scanRunId },
    include: { client: { include: { context: true, competitors: true } } },
  });
  if (!run) throw new Error("Scan not found.");

  const clientAds = await prisma.ad.findMany({
    where: { clientId: run.clientId, advertiserType: "CLIENT" },
    take: 40,
  });
  const competitorWinners = await prisma.ad.findMany({
    where: { clientId: run.clientId, advertiserType: "COMPETITOR", isProvenWinner: true },
    include: { analysis: true },
    orderBy: { winningScore: "desc" },
    take: 40,
  });

  const ctx = run.client.context;
  const payload = {
    client: {
      name: run.client.name,
      industry: ctx?.industry ?? null,
      audience: ctx?.targetAudience ?? null,
      usp: ctx?.usp ?? null,
      products: ctx?.products ?? null,
      positioning: ctx?.positioning ?? null,
      brandVoice: ctx?.brandVoice ?? null,
      goals: ctx?.goals ?? null,
      // Deep-research brief (from the Ad Copy Studio), when available — makes the
      // whole comparison brand-aware instead of generic.
      brief: ctx?.brandBrief ?? null,
    },
    clientAds: clientAds.map((a) => ({
      format: a.mediaType,
      daysLive: a.daysLiveLatest,
      headline: a.headline,
      copy: a.primaryText?.slice(0, 220) ?? null,
      cta: a.ctaText,
    })),
    competitors: run.client.competitors.map((c) => ({ name: c.name })),
    competitorWinners: competitorWinners.map((a) => ({
      advertiser: a.advertiserName,
      format: a.mediaType,
      daysLive: a.daysLiveLatest,
      winningScore: a.winningScore,
      headline: a.headline,
      copy: a.primaryText?.slice(0, 220) ?? null,
      cta: a.ctaText,
      teardown: a.analysis?.teardown ?? null,
    })),
  };

  const prompt = `You are the sharpest competitive-advertising analyst in the industry — the analyst other agencies wish they had. Compare this client's Meta ads against their competitors' PROVEN WINNERS (long-running / scaled ads, which win because the advertiser keeps paying to run them).

How to analyse (do this rigorously):
- GROUND every claim in the actual data below. When you cite a strength or gap, tie it to specific competitor winners (their headline/copy/format/days-live), not vibes.
- A competitor ad running 90+ days or scaled across many creatives is a PROVEN performer — treat its angle/offer/format as validated demand, and judge whether the client is matching it.
- Read the client's brief/USP and keep recommendations ON-BRAND and realistic — never suggest claims the brand can't make.
- Be decisive: say exactly where the client leads, is at par, and is behind, and give fixes a creative team can ship THIS WEEK. No generic filler.
Output strictly in marketing terms and tie everything back to driving SALES.

Return JSON with this exact shape:
{
  "gapScore": 0-100,                // how big the opportunity to catch up is (higher = more to gain)
  "tldr": "one punchy sentence the team reads first",
  "overallSummary": "3-5 sentence plain-English summary of the whole comparison",
  "lackingSummary": "markdown: ranked list of where the client is lacking, biggest first",
  "salesGrowthPlan": "markdown: the specific moves to improve and GROW SALES, prioritised",
  "suggestions": "markdown: 3-5 bold next-campaign / steal-and-improve creative concepts, on the client's brand voice",
  "competitors": [ { "name": "<exact competitor name>", "rating": 1-10, "summary": "why they're strong/weak in marketing terms", "topStrength": "the one thing to learn from them" } ],
  "dimensions": [ { "dimension": "<one of ${DIMENSIONS.join("|")}>", "clientScore": 0-10, "competitorBestScore": 0-10, "mark": "LEAD|PAR|BEHIND", "reasoning": "one line", "fix": "the concrete fix" } ]
}
Cover every dimension you have evidence for. Rate each competitor 1-10 on overall ad strength.

DATA:
${JSON.stringify(payload)}`;

  const ai = await completeJson<AIResult>(prompt, { maxTokens: 3500 });

  // LLMs sometimes return list fields as JSON arrays instead of markdown
  // strings — coerce so persistence never fails on shape.
  const fields = {
    gapScore: clampInt(ai.gapScore, 0, 100),
    tldr: str(ai.tldr),
    overallSummary: str(ai.overallSummary),
    lackingSummary: str(ai.lackingSummary),
    salesGrowthPlan: str(ai.salesGrowthPlan),
    suggestions: str(ai.suggestions),
  };
  const comparison = await prisma.comparison.upsert({
    where: { scanRunId },
    create: { scanRunId, ...fields },
    update: fields,
  });

  // Per-aspect dimension cards (replace previous).
  await prisma.comparisonDimension.deleteMany({ where: { comparisonId: comparison.id } });
  for (const d of ai.dimensions ?? []) {
    if (!DIMENSIONS.includes(d.dimension as Dimension)) continue;
    await prisma.comparisonDimension.create({
      data: {
        comparisonId: comparison.id,
        dimension: d.dimension as Dimension,
        clientScore: clampInt(d.clientScore, 0, 10),
        competitorBestScore: clampInt(d.competitorBestScore, 0, 10),
        mark: normMark(d.mark),
        reasoning: str(d.reasoning),
        fix: str(d.fix),
      },
    });
  }

  // Per-competitor 1–10 ratings (replace previous).
  await prisma.competitorAssessment.deleteMany({ where: { comparisonId: comparison.id } });
  for (const ca of ai.competitors ?? []) {
    const comp = run.client.competitors.find((c) => norm(c.name) === norm(ca.name));
    if (!comp) continue;
    await prisma.competitorAssessment.create({
      data: {
        comparisonId: comparison.id,
        competitorId: comp.id,
        rating: clampInt(ca.rating, 1, 10),
        summary: str(ca.summary),
        topStrength: str(ca.topStrength),
        winnerCount: competitorWinners.filter((w) => w.competitorId === comp.id).length,
      },
    });
  }

  return comparison.id;
}

function clampInt(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(Number(n) || 0)));
}

/** Normalize a brand name for fuzzy matching (strip case + punctuation). */
function norm(s: string): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Coerce an LLM-returned mark to a valid enum value (default PAR). */
function normMark(m: unknown): "LEAD" | "PAR" | "BEHIND" {
  const u = String(m ?? "").toUpperCase();
  return u === "LEAD" || u === "BEHIND" ? u : "PAR";
}

/** Coerce an LLM field (string | string[] | object) into a markdown string. */
function str(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v.trim() || null;
  if (Array.isArray(v)) {
    return (
      v
        .map((x) => {
          const line = typeof x === "string" ? x : JSON.stringify(x);
          return /^\s*[-*\d]/.test(line) ? line : `- ${line}`;
        })
        .join("\n") || null
    );
  }
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
