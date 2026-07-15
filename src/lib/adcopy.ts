/**
 * Ad Copy Studio — the creative pipeline.
 *
 *   researchClient()      → deep Client Dossier (who they are, what wins for them)
 *   researchCompetitors() → the closest rivals + their REAL ad copy
 *   structureIntel()      → distil each rival into hooks / angles / offers / gaps
 *   generateHeadlines()   → a senior copywriter writes many headlines + concepts,
 *                           each engineered to beat a specific competitor gap.
 *
 * Everything is persisted to an AdCopyRun so the team can revisit past runs.
 */
import { prisma } from "./db";
import { completeJson, llmConfigured, llmProvider } from "./llm";
import {
  researchClient,
  researchCompetitors,
  type ClientDossier,
  type CompetitorResearch,
} from "./research";

// ── Output shapes ────────────────────────────────────────────────────────────

export interface CompetitorIntel {
  name: string;
  closeness: number;
  positioning: string;
  priceTier: string;
  tone: string;
  angles: string[]; // messaging angles they lean on
  hooks: string[]; // hooks / headlines they use
  offers: string[]; // promos / offers they run
  weaknesses: string[]; // gaps a rival can exploit
}

export interface HeadlineGroup {
  angle: string; // e.g. "Problem–Solution", "Social Proof", "Offer-led"
  intent: string; // one line on when/why this angle wins
  headlines: Array<{ text: string; rationale: string }>;
}

export interface AdConcept {
  name: string;
  angle: string;
  headline: string;
  primaryText: string;
  cta: string;
  whyItBeatsCompetitors: string;
}

export interface AdCopyOutput {
  strategy: {
    summary: string;
    positioningVsCompetitors: string;
    whitespace: string[]; // angles rivals AREN'T using = opportunity
  };
  competitorIntel: CompetitorIntel[];
  headlineGroups: HeadlineGroup[];
  concepts: AdConcept[];
}

export interface AdCopyResult {
  runId: string;
  clientDossier: ClientDossier;
  output: AdCopyOutput;
}

// ── Prompts ──────────────────────────────────────────────────────────────────

/** Compact a competitor's research + real ad copy into a prompt block. */
function competitorBlock(c: CompetitorResearch): string {
  const ads = c.adSamples.length
    ? c.adSamples
        .map(
          (a, i) =>
            `  ${i + 1}. [${a.isProvenWinner ? "WINNER" : "ad"}${
              a.daysLive != null ? `, ${a.daysLive}d live` : ""
            }] headline: ${a.headline ?? "—"} | copy: ${
              a.primaryText ?? "—"
            } | cta: ${a.cta ?? "—"}`
        )
        .join("\n")
    : "  (no scanned ads on file)";
  return `### ${c.name} (closeness ${c.closeness}/10${
    c.tracked ? ", tracked" : ""
  })
WEB RESEARCH: ${c.researchText ?? "(none)"}
THEIR REAL ADS:
${ads}`;
}

function structureIntelPrompt(competitors: CompetitorResearch[]): string {
  return `You are an elite competitive-advertising analyst. For EACH competitor below, distil the research + their real ads into a sharp intelligence card. Ground every field in the evidence given — do not invent offers or claims.

${competitors.map(competitorBlock).join("\n\n")}

Return JSON exactly:
{
  "competitors": [
    {
      "name": "<exact name>",
      "positioning": "how they position themselves",
      "priceTier": "budget | mid-market | premium | luxury",
      "tone": "their ad voice in a few words",
      "angles": ["the messaging angles they repeatedly use"],
      "hooks": ["actual hook lines / headline styles they use"],
      "offers": ["promos/offers they run — only if evidenced"],
      "weaknesses": ["gaps or things they DON'T do that a rival could exploit"]
    }
  ]
}
One object per competitor, same order. JSON only.`;
}

function headlinePrompt(
  dossier: ClientDossier,
  intel: CompetitorIntel[],
  goal: string | null
): string {
  return `You are a world-class direct-response copywriter and creative strategist for a performance-marketing agency. Write Meta (Facebook/Instagram) ad HEADLINES for the client below that will out-perform their competitors. You have deep research on both sides — USE IT. Every headline must be specific to THIS brand (never generic filler), match their voice, and be engineered to win against a real competitor gap.

CLIENT DOSSIER:
${JSON.stringify(dossier)}

COMPETITOR INTELLIGENCE (what rivals are already doing — do NOT copy them; out-flank them):
${JSON.stringify(intel)}
${goal ? `\nCAMPAIGN GOAL / BRIEF: ${goal}` : ""}

Rules:
- Study the competitors' hooks, angles and offers. Find the WHITESPACE — angles they under-use — and lean into the client's real USP and proof points.
- Headlines must be punchy, scroll-stopping, and ad-ready (≤ ~12 words). India-aware (₹, local context) when relevant.
- Cover a range of proven angles. For each angle give 5–6 distinct headlines.
- Do not fabricate offers, numbers, or claims the dossier doesn't support.

Return JSON exactly:
{
  "strategy": {
    "summary": "the creative strategy in 2–3 sentences",
    "positioningVsCompetitors": "how we position the client's ads against these rivals",
    "whitespace": ["angles/messages competitors are NOT using that we should own"]
  },
  "headlineGroups": [
    {
      "angle": "<angle name, e.g. Problem–Solution | Social Proof | Offer-led | Aspiration | Authority | FOMO | Curiosity | Transformation | Comparison>",
      "intent": "one line on why this angle wins for this brand",
      "headlines": [ { "text": "the headline", "rationale": "≤14 words: why it works / which competitor gap it exploits" } ]
    }
  ],
  "concepts": [
    {
      "name": "short concept name",
      "angle": "the angle",
      "headline": "the hero headline",
      "primaryText": "2–4 sentence primary text, on brand voice",
      "cta": "the call-to-action",
      "whyItBeatsCompetitors": "one line tying it to a specific competitor weakness"
    }
  ]
}
Aim for 6–8 headlineGroups and 4–6 concepts. JSON only.`;
}

// ── Orchestration ────────────────────────────────────────────────────────────

/**
 * Full pipeline: research the client + competitors, then generate the copy.
 * Persists an AdCopyRun (RUNNING → SUCCEEDED/FAILED) with every artifact.
 */
export async function generateAdCopy(
  clientId: string,
  opts: { website?: string | null; goal?: string | null; maxCompetitors?: number } = {}
): Promise<AdCopyResult> {
  if (!llmConfigured()) throw new Error("No AI configured.");

  const run = await prisma.adCopyRun.create({
    data: {
      clientId,
      status: "RUNNING",
      website: opts.website?.trim() || null,
      goal: opts.goal?.trim() || null,
      model: llmProvider() ?? undefined,
    },
  });

  try {
    // 1. Deep client research (also sharpens ClientContext for other analyses).
    const clientDossier = await researchClient(clientId, { website: opts.website });
    await prisma.adCopyRun.update({
      where: { id: run.id },
      data: { clientDossier: clientDossier as object },
    });

    // 2. Research the closest competitors + their real ad copy.
    const research = await researchCompetitors(clientId, {
      max: opts.maxCompetitors ?? 6,
    });

    // 3. Distil each competitor into an intelligence card.
    let competitorIntel: CompetitorIntel[] = [];
    if (research.length) {
      const structured = await completeJson<{ competitors: CompetitorIntel[] }>(
        structureIntelPrompt(research),
        { maxTokens: 3000 }
      );
      // Re-attach closeness (the model isn't asked to echo it).
      competitorIntel = (structured.competitors ?? []).map((c, i) => ({
        ...c,
        closeness: research[i]?.closeness ?? c.closeness ?? 5,
      }));
    }

    // 4. Generate the headlines + concepts.
    const generated = await completeJson<Omit<AdCopyOutput, "competitorIntel">>(
      headlinePrompt(clientDossier, competitorIntel, opts.goal ?? null),
      { maxTokens: 4000 }
    );

    const output: AdCopyOutput = {
      strategy: generated.strategy ?? {
        summary: "",
        positioningVsCompetitors: "",
        whitespace: [],
      },
      competitorIntel,
      headlineGroups: generated.headlineGroups ?? [],
      concepts: generated.concepts ?? [],
    };

    await prisma.adCopyRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCEEDED",
        competitorIntel: competitorIntel as object,
        output: output as object,
        finishedAt: new Date(),
      },
    });

    return { runId: run.id, clientDossier, output };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.adCopyRun.update({
      where: { id: run.id },
      data: { status: "FAILED", error: message, finishedAt: new Date() },
    });
    throw err;
  }
}
