/**
 * Creative teardown taxonomy + 1-to-1 ad comparison.
 *
 * Scores a head-to-head between a client ad and a competitor ad across the
 * radar dimensions, classifies persuasion/offer, and returns marketing
 * insights (why they win / where you lose / immediate fixes). Uses the text
 * LLM (Groq) on the ads' copy + metadata; visual dimensions are inferred from
 * format/metadata until Gemini vision is wired per-ad.
 */
import { completeJson, llmConfigured } from "./llm";
import { integrations } from "./env";
import { geminiGenerate, fetchImagePart, fetchVideoPart } from "./gemini";

/** The 10 radar axes (the "must-have" chart). */
export const RADAR_DIMS = [
  { key: "hook", label: "Hook" },
  { key: "visuals", label: "Visuals" },
  { key: "offer", label: "Offer" },
  { key: "cta", label: "CTA" },
  { key: "emotion", label: "Emotion" },
  { key: "socialProof", label: "Social Proof" },
  { key: "branding", label: "Branding" },
  { key: "persuasion", label: "Persuasion" },
  { key: "storytelling", label: "Storytelling" },
  { key: "trust", label: "Trust" },
] as const;

export type DimKey = (typeof RADAR_DIMS)[number]["key"];

/** Overall Ad Score formula (weights sum to 1.0). Storytelling/Trust are
 *  radar-only and not weighted into the headline score. */
export const SCORE_WEIGHTS: Record<string, number> = {
  hook: 0.2,
  offer: 0.15,
  socialProof: 0.15,
  cta: 0.1,
  visuals: 0.1,
  emotion: 0.1,
  persuasion: 0.1,
  branding: 0.1,
};

export const PERSUASION_ANGLES = [
  "Fear",
  "Aspiration",
  "Trust",
  "Luxury",
  "FOMO",
  "Authority",
  "Problem-Solution",
  "Transformation",
  "Emotional Appeal",
] as const;

/** Weighted 0-100 Overall Ad Score from per-dimension 0-10 scores. */
export function overallAdScore(s: Record<string, number>): number {
  let sum = 0;
  for (const [k, w] of Object.entries(SCORE_WEIGHTS)) sum += w * (s[k] ?? 0);
  return Math.round(sum * 10);
}

// ── Multi-column comparison (Your Ad vs N competitors) ──────────────────────

/** The aspect rows shown in the multi-column comparison (matches the UI). */
export const COMPARE_ASPECTS = [
  { key: "hook", label: "Hook", desc: "How well it grabs attention" },
  { key: "offerClarity", label: "Offer Clarity", desc: "Clarity of offer & value prop" },
  { key: "visualAppeal", label: "Visual Appeal", desc: "Creativity, design & aesthetics" },
  { key: "onScreenText", label: "On-Screen Text", desc: "Text usage & readability" },
  { key: "scriptVoiceover", label: "Script / Voiceover", desc: "Messaging & storytelling" },
  { key: "socialProof", label: "Social Proof", desc: "Reviews, UGC, testimonials" },
  { key: "ctaEffectiveness", label: "CTA Effectiveness", desc: "Call-to-action strength" },
  { key: "emotionalAppeal", label: "Emotional Appeal", desc: "Emotion & persuasion angle" },
  { key: "branding", label: "Branding", desc: "Brand presence & recall" },
] as const;

export type AspectKey = (typeof COMPARE_ASPECTS)[number]["key"];

export interface ColumnScore {
  score: number;
  note: string | null;
  /** True when the aspect doesn't apply to this format (e.g. voiceover on a
   *  static image). N/A aspects are excluded from the overall score. */
  na: boolean;
}

export interface CompareColumn {
  adId: string;
  advertiserName: string;
  isClient: boolean;
  overall: number; // 0-100
  label: string;
  scores: Record<AspectKey, ColumnScore>;
}

export interface ColumnsInsights {
  vsAdId: string;
  vsName: string;
  whyTheyWin: string[];
  whereYouLose: string[];
  immediateFixes: string[];
  verdict: string;
}

export interface ColumnsResult {
  aspects: typeof COMPARE_ASPECTS;
  columns: CompareColumn[];
  insights: ColumnsInsights | null;
}

export function overallLabel(overall: number): string {
  if (overall >= 80) return "Excellent";
  if (overall >= 65) return "Good";
  if (overall >= 50) return "Above Average";
  return "Needs Work";
}

interface AIColumn {
  index: number;
  scores: Record<AspectKey, { score: number; note?: string; na?: boolean }>;
}

interface AIInsights {
  vsIndex: number;
  whyTheyWin: string[];
  whereYouLose: string[];
  immediateFixes: string[];
  verdict: string;
}

export async function compareAdColumns(
  clientAd: DuelAdInput,
  competitorAds: DuelAdInput[],
  context: { industry?: string | null; audience?: string | null; brandVoice?: string | null } = {}
): Promise<ColumnsResult | null> {
  if (!llmConfigured()) return null;

  const ads = [clientAd, ...competitorAds];
  const scaleNote = `Scoring scale — calibrate CONSISTENTLY across all ads: 0-2 absent/poor · 3-4 weak · 5-6 average · 7-8 strong · 9-10 exceptional. Base EVERY score on the actual creative AND the ad copy — never on assumptions. For VIDEO ads you are given the FULL video (frames + audio): judge the hook in the first 3 seconds, pacing/editing, on-screen text, voiceover/script and music from what you actually watch and hear. For static images, score only what's visible and set "na": true for aspects that don't apply (e.g. Script/Voiceover) — N/A aspects are excluded from the overall score.`;

  const intro = `You are a senior performance-marketing analyst scoring Meta ads. Ad index 0 is OUR client's ad; the rest are competitors.
CLIENT BRAND: industry=${context.industry ?? "?"}, audience=${context.audience ?? "?"}, voice=${context.brandVoice ?? "?"}
Score each ad 0-10 on: ${COMPARE_ASPECTS.map((a) => `${a.label} (${a.desc})`).join("; ")}.
${scaleNote}`;

  const schema = `Return JSON exactly:
{
  "ads": [ { "index": 0, "scores": { ${COMPARE_ASPECTS.map((a) => `"${a.key}": { "score": 0-10, "note": "≤12 words on WHY", "na": false }`).join(", ")} } }, ... one object per ad ],
  "insights": {
    "vsIndex": <index >=1 of the SINGLE toughest competitor to beat>,
    "whyTheyWin": ["3-4 bullets grounded in what you SEE"],
    "whereYouLose": ["3-4 bullets specific to our ad"],
    "immediateFixes": ["3-4 do-this-now fixes"],
    "verdict": "one punchy sentence"
  }
}
JSON only.`;

  let ai: { ads?: AIColumn[]; insights?: AIInsights };
  if (integrations.gemini) {
    // Multimodal: let Gemini actually SEE each ad creative.
    const parts: Array<Record<string, unknown>> = [{ text: intro }];
    for (let i = 0; i < ads.length; i++) {
      const ad = ads[i];
      parts.push({
        text: `\n=== AD ${i} — ${i === 0 ? "YOUR BRAND" : "COMPETITOR"}: ${ad.advertiserName} (${ad.mediaType}) ===`,
      });
      // For video ads, send the actual video so Gemini watches the whole ad
      // (frames + audio); fall back to the thumbnail if it fails or is too big.
      const isVideo = ad.mediaType === "VIDEO" || ad.mediaType === "REEL";
      let part: Record<string, unknown> | null = null;
      if (isVideo && ad.videoUrl) part = await fetchVideoPart(ad.videoUrl);
      if (!part && ad.imageUrl) part = await fetchImagePart(ad.imageUrl);
      parts.push(part ?? { text: "(no media available — score visual aspects conservatively)" });
      parts.push({
        text: `Copy: ${ad.primaryText?.slice(0, 400) ?? "—"}\nHeadline: ${ad.headline ?? "—"}\nCTA: ${ad.ctaText ?? "—"}\nDays live: ${ad.daysLive ?? "—"}`,
      });
    }
    parts.push({ text: `\n${schema}` });
    const raw = await geminiGenerate(parts);
    ai = parseColumnsJson(raw);
  } else {
    const fmt = (a: DuelAdInput, i: number) => ({
      index: i,
      role: i === 0 ? "YOUR BRAND" : "COMPETITOR",
      advertiser: a.advertiserName,
      format: a.mediaType,
      daysLive: a.daysLive,
      headline: a.headline,
      primaryText: a.primaryText?.slice(0, 400) ?? null,
      cta: a.ctaText,
    });
    ai = await completeJson<{ ads: AIColumn[]; insights?: AIInsights }>(
      `${intro}\n\nADS:\n${JSON.stringify(ads.map(fmt))}\n\n${schema}`,
      { maxTokens: 3500 }
    );
  }

  const columns: CompareColumn[] = ads.map((ad, i) => {
    const found = ai.ads?.find((x) => x.index === i);
    const scores = {} as Record<AspectKey, ColumnScore>;
    let sum = 0;
    let count = 0;
    for (const { key } of COMPARE_ASPECTS) {
      const raw = found?.scores?.[key];
      const na = Boolean(raw?.na);
      const score = clamp10(raw?.score);
      scores[key] = { score, note: (raw?.note ?? null) || null, na };
      if (!na) {
        sum += score;
        count += 1;
      }
    }
    // Overall averages only the aspects that APPLY (N/A excluded), so a static
    // image isn't penalised for having no voiceover.
    const overall = count > 0 ? Math.round((sum / count) * 10) : 0;
    return {
      adId: ad.id,
      advertiserName: ad.advertiserName,
      isClient: i === 0,
      overall,
      label: overallLabel(overall),
      scores,
    };
  });

  // Resolve which competitor the 1-to-1 insights are about.
  let insights: ColumnsInsights | null = null;
  if (ai.insights) {
    // Prefer the LLM's pick; fall back to the highest-overall competitor.
    let vsIndex = Math.round(Number(ai.insights.vsIndex));
    if (!(vsIndex >= 1 && vsIndex < ads.length)) {
      vsIndex = 1;
      let best = -1;
      columns.forEach((c, i) => {
        if (i >= 1 && c.overall > best) {
          best = c.overall;
          vsIndex = i;
        }
      });
    }
    const vsAd = ads[vsIndex];
    insights = {
      vsAdId: vsAd.id,
      vsName: vsAd.advertiserName,
      whyTheyWin: ai.insights.whyTheyWin ?? [],
      whereYouLose: ai.insights.whereYouLose ?? [],
      immediateFixes: ai.insights.immediateFixes ?? [],
      verdict: ai.insights.verdict ?? "",
    };
  }

  return { aspects: COMPARE_ASPECTS, columns, insights };
}

export interface DuelAdInput {
  id: string;
  advertiserName: string;
  mediaType: string;
  daysLive: number | null;
  winningScore: number | null;
  headline: string | null;
  primaryText: string | null;
  ctaText: string | null;
  /** Creative image (or video thumbnail) — sent to Gemini vision for scoring. */
  imageUrl: string | null;
  /** Video file — for video ads we send this so Gemini watches the whole ad. */
  videoUrl: string | null;
}

interface AISide {
  hook: number;
  visuals: number;
  offer: number;
  cta: number;
  emotion: number;
  socialProof: number;
  branding: number;
  persuasion: number;
  storytelling: number;
  trust: number;
  persuasionAngle: string;
  offerType: string;
}

interface AIDuel {
  client: AISide;
  competitor: AISide;
  dimensionNotes: Partial<Record<DimKey, string>>;
  whyCompetitorWins: string[];
  whereClientLosing: string[];
  immediateFixes: string[];
  verdict: string;
}

export interface DuelSide {
  scores: Record<DimKey, number>;
  overall: number;
  persuasionAngle: string;
  offerType: string;
  daysLive: number | null;
  winningScore: number | null;
}

export interface DuelResult {
  dims: typeof RADAR_DIMS;
  client: DuelSide;
  competitor: DuelSide;
  winners: Record<DimKey, "CLIENT" | "COMPETITOR" | "TIE">;
  notes: Partial<Record<DimKey, string>>;
  whyCompetitorWins: string[];
  whereClientLosing: string[];
  immediateFixes: string[];
  verdict: string;
  overallWinner: "CLIENT" | "COMPETITOR" | "TIE";
}

function clamp10(n: unknown): number {
  return Math.max(0, Math.min(10, Math.round(Number(n) || 0)));
}

function parseColumnsJson(raw: string): { ads?: AIColumn[]; insights?: AIInsights } {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(cleaned);
}

function sideScores(s: AISide): Record<DimKey, number> {
  const out = {} as Record<DimKey, number>;
  for (const { key } of RADAR_DIMS) out[key] = clamp10(s[key]);
  return out;
}

export async function compareTwoAds(
  clientAd: DuelAdInput,
  competitorAd: DuelAdInput,
  context: { industry?: string | null; audience?: string | null; brandVoice?: string | null } = {}
): Promise<DuelResult | null> {
  if (!llmConfigured()) return null;

  const fmtAd = (a: DuelAdInput) => ({
    advertiser: a.advertiserName,
    format: a.mediaType,
    daysLive: a.daysLive,
    headline: a.headline,
    primaryText: a.primaryText?.slice(0, 500) ?? null,
    cta: a.ctaText,
  });

  const prompt = `Do a 1-to-1 head-to-head between OUR CLIENT's ad and a COMPETITOR's ad. Score each ad 0-10 on every dimension and tell us, in marketing terms, exactly what the client is doing wrong and how to fix it.

CLIENT BRAND: industry=${context.industry ?? "?"}, audience=${context.audience ?? "?"}, voice=${context.brandVoice ?? "?"}

CLIENT AD: ${JSON.stringify(fmtAd(clientAd))}
COMPETITOR AD: ${JSON.stringify(fmtAd(competitorAd))}

Return JSON exactly:
{
  "client":     { "hook":0-10,"visuals":0-10,"offer":0-10,"cta":0-10,"emotion":0-10,"socialProof":0-10,"branding":0-10,"persuasion":0-10,"storytelling":0-10,"trust":0-10,"persuasionAngle":"<one of ${PERSUASION_ANGLES.join("|")}>","offerType":"<e.g. 50% OFF / BOGO / Free Delivery / None>" },
  "competitor": { same keys },
  "dimensionNotes": { "hook":"one line on the gap", "offer":"...", ... only where notable },
  "whyCompetitorWins": ["3-5 bullets"],
  "whereClientLosing": ["3-5 bullets"],
  "immediateFixes": ["3-5 concrete, do-this-now fixes"],
  "verdict": "one punchy sentence"
}
Be specific to the actual ad copy. JSON only.`;

  const ai = await completeJson<AIDuel>(prompt, { maxTokens: 2500 });

  const client = sideScores(ai.client);
  const competitor = sideScores(ai.competitor);

  const winners = {} as Record<DimKey, "CLIENT" | "COMPETITOR" | "TIE">;
  for (const { key } of RADAR_DIMS) {
    winners[key] =
      client[key] > competitor[key]
        ? "CLIENT"
        : competitor[key] > client[key]
        ? "COMPETITOR"
        : "TIE";
  }

  const clientOverall = overallAdScore(client);
  const competitorOverall = overallAdScore(competitor);

  return {
    dims: RADAR_DIMS,
    client: {
      scores: client,
      overall: clientOverall,
      persuasionAngle: ai.client.persuasionAngle ?? "—",
      offerType: ai.client.offerType ?? "—",
      daysLive: clientAd.daysLive,
      winningScore: clientAd.winningScore,
    },
    competitor: {
      scores: competitor,
      overall: competitorOverall,
      persuasionAngle: ai.competitor.persuasionAngle ?? "—",
      offerType: ai.competitor.offerType ?? "—",
      daysLive: competitorAd.daysLive,
      winningScore: competitorAd.winningScore,
    },
    winners,
    notes: ai.dimensionNotes ?? {},
    whyCompetitorWins: ai.whyCompetitorWins ?? [],
    whereClientLosing: ai.whereClientLosing ?? [],
    immediateFixes: ai.immediateFixes ?? [],
    verdict: ai.verdict ?? "",
    overallWinner:
      clientOverall > competitorOverall
        ? "CLIENT"
        : competitorOverall > clientOverall
        ? "COMPETITOR"
        : "TIE",
  };
}
