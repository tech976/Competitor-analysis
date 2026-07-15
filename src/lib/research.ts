/**
 * Deep research engine — powers the Ad Copy Studio and enriches every analysis.
 *
 * Two capabilities the rest of the app didn't have before:
 *   1. fetchWebsiteText()  — read the client's own website (ground truth).
 *   2. webResearch()       — Gemini + Google Search grounding, so agents read
 *                            the LIVE web (site, socials, reviews, news) instead
 *                            of relying on stale model memory.
 *
 * researchClient() builds a structured Client Dossier and writes the sharpened
 * brand context back onto ClientContext — so the Run-Scan and 1-to-1 analyses
 * automatically become brand-aware too. researchCompetitors() assembles the
 * closest rivals (tracked + discovered), researches each on the web, and folds
 * in the REAL ad copy we already scraped for them.
 */
import { prisma } from "./db";
import { completeJson, llmConfigured } from "./llm";
import { integrations } from "./env";
import { geminiGrounded } from "./gemini";
import { discoverCompetitors } from "./discover";

// ── Types ───────────────────────────────────────────────────────────────────

export interface ClientDossier {
  brand: string;
  oneLiner: string;
  usp: string;
  offerings: string[];
  audience: string;
  positioning: string;
  priceTier: string;
  tone: string;
  proofPoints: string[];
  differentiators: string[];
  keyMessages: string[];
  objections: string[];
  industry: string;
  geography: string;
  sources: string[];
}

export interface AdCopySample {
  headline: string | null;
  primaryText: string | null;
  cta: string | null;
  daysLive: number | null;
  winningScore: number | null;
  isProvenWinner: boolean;
}

export interface CompetitorResearch {
  name: string;
  closeness: number; // 1-10, how head-to-head
  tracked: boolean; // do we already scan their ads
  researchText: string | null; // grounded web research (raw)
  adSamples: AdCopySample[]; // their real ad copy from our scans
}

// ── Web primitives ───────────────────────────────────────────────────────────

/** Strip a raw HTML document down to readable text (title + meta + body). */
function htmlToText(html: string): string {
  const pick = (re: RegExp): string => html.match(re)?.[1]?.trim() ?? "";
  const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const desc =
    pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return [title && `TITLE: ${title}`, desc && `DESCRIPTION: ${desc}`, body]
    .filter(Boolean)
    .join("\n");
}

/** Fetch a website and return readable text (best-effort, capped). */
export async function fetchWebsiteText(url: string): Promise<string | null> {
  try {
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const res = await fetch(normalized, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; AdGapIQ/1.0; +brand-research bot)",
        accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const text = htmlToText(html);
    return text.length > 40 ? text.slice(0, 7000) : null;
  } catch {
    return null;
  }
}

/** Grounded web research; null if Gemini/grounding is unavailable (caller falls back). */
async function webResearch(prompt: string): Promise<string | null> {
  if (!integrations.gemini) return null;
  try {
    const out = await geminiGrounded(prompt);
    return out.trim() || null;
  } catch {
    return null;
  }
}

// ── Client research ──────────────────────────────────────────────────────────

function clientDossierPrompt(
  name: string,
  ctx: { industry?: string | null; geography?: string | null } | null,
  websiteText: string | null,
  webBrief: string | null
): string {
  return `You are a senior brand strategist. Build a rigorous, evidence-based dossier on the brand "${name}"${
    ctx?.geography ? ` (market: ${ctx.geography})` : ""
  }. Use ONLY the material provided plus what is clearly, widely known — never invent specifics, awards, or numbers.

${websiteText ? `THEIR WEBSITE (extracted text):\n${websiteText}\n` : ""}
${webBrief ? `LIVE WEB RESEARCH (search results synthesis):\n${webBrief}\n` : ""}
${!websiteText && !webBrief ? `No website/search material was available — reason from the brand name and industry, and keep claims general.\n` : ""}

Return JSON exactly:
{
  "brand": "${name}",
  "oneLiner": "what they do, in one crisp line",
  "usp": "their single strongest differentiator / core promise",
  "offerings": ["key products or services they sell"],
  "audience": "who they target (demographics + psychographics)",
  "positioning": "where they sit in the market (e.g. premium disruptor, value leader)",
  "priceTier": "budget | mid-market | premium | luxury (best guess)",
  "tone": "their brand voice in a few words",
  "proofPoints": ["credibility signals: real numbers, certifications, testimonials, press — only if evidenced"],
  "differentiators": ["concrete things that set them apart from rivals"],
  "keyMessages": ["the core messages/claims they push in marketing"],
  "objections": ["buyer hesitations/objections their marketing must overcome"],
  "industry": "${ctx?.industry ?? "infer it"}",
  "geography": "${ctx?.geography ?? "infer it"}",
  "sources": ["urls or sources referenced, if any"]
}
JSON only.`;
}

/**
 * Deep-research a client: read their website + the live web, synthesise a
 * structured dossier, and persist the sharpened context back onto the client
 * (so scan/comparison analyses inherit it). `website` overrides the stored one.
 */
export async function researchClient(
  clientId: string,
  opts: { website?: string | null } = {}
): Promise<ClientDossier> {
  if (!llmConfigured()) throw new Error("No AI configured.");

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { context: true },
  });
  if (!client) throw new Error("Client not found.");
  const ctx = client.context;

  const website =
    (opts.website && opts.website.trim()) || ctx?.sourceWebsite || null;
  const websiteText = website ? await fetchWebsiteText(website) : null;

  const webBrief = await webResearch(
    `Research the brand "${client.name}"${
      ctx?.geography ? ` in ${ctx.geography}` : ""
    }${website ? ` (website: ${website})` : ""}. Search their website, Instagram/Facebook, Google, reviews and any press. Summarise, in detail: what they sell, their unique selling proposition, target audience, price positioning, brand voice/tone, credibility/proof points, and the main messages they push in their marketing. Be concrete and cite what you find.`
  );

  const dossier = await completeJson<ClientDossier>(
    clientDossierPrompt(client.name, ctx, websiteText, webBrief),
    { maxTokens: 2000 }
  );

  // Persist the sharpened brand context so EVERY analysis benefits.
  await persistDossierToContext(clientId, website, dossier);
  return dossier;
}

async function persistDossierToContext(
  clientId: string,
  website: string | null,
  d: ClientDossier
): Promise<void> {
  const join = (a: string[] | undefined) =>
    Array.isArray(a) && a.length ? a.join("; ") : undefined;
  const brandBrief = [
    d.oneLiner && `What they do: ${d.oneLiner}`,
    d.usp && `USP: ${d.usp}`,
    d.positioning && `Positioning: ${d.positioning} (${d.priceTier ?? "?"})`,
    join(d.keyMessages) && `Key messages: ${join(d.keyMessages)}`,
    join(d.proofPoints) && `Proof: ${join(d.proofPoints)}`,
    join(d.objections) && `Objections to beat: ${join(d.objections)}`,
  ]
    .filter(Boolean)
    .join("\n");

  const data = {
    industry: d.industry || undefined,
    geography: d.geography || undefined,
    targetAudience: d.audience || undefined,
    usp: d.usp || undefined,
    products: join(d.offerings),
    positioning: d.positioning || undefined,
    brandVoice: d.tone || undefined,
    brandBrief: brandBrief || undefined,
    sourceWebsite: website || undefined,
  };
  await prisma.clientContext.upsert({
    where: { clientId },
    create: { clientId, ...data },
    update: data,
  });
}

// ── Competitor research ──────────────────────────────────────────────────────

/** Pull the real ad copy we've scraped for a competitor (winners first). */
async function competitorAdSamples(
  clientId: string,
  competitorId: string,
  take = 8
): Promise<AdCopySample[]> {
  const ads = await prisma.ad.findMany({
    where: { clientId, competitorId, advertiserType: "COMPETITOR" },
    orderBy: [{ isProvenWinner: "desc" }, { winningScore: "desc" }],
    take,
    select: {
      headline: true,
      primaryText: true,
      ctaText: true,
      daysLiveLatest: true,
      winningScore: true,
      isProvenWinner: true,
    },
  });
  return ads.map((a) => ({
    headline: a.headline,
    primaryText: a.primaryText?.slice(0, 300) ?? null,
    cta: a.ctaText,
    daysLive: a.daysLiveLatest,
    winningScore: a.winningScore,
    isProvenWinner: a.isProvenWinner,
  }));
}

/**
 * Assemble and research the closest competitors. Prefers TRACKED competitors
 * (we have their real ads) and tops up with freshly DISCOVERED ones to reach
 * `max`, then researches each on the live web in parallel.
 */
export async function researchCompetitors(
  clientId: string,
  opts: { max?: number } = {}
): Promise<CompetitorResearch[]> {
  const max = opts.max ?? 6;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { context: true, competitors: true },
  });
  if (!client) throw new Error("Client not found.");
  const geo = client.context?.geography ?? "India";

  // Seed with tracked competitors (real ad data), keep their ids for lookups.
  type Seed = { name: string; closeness: number; competitorId: string | null };
  const seeds: Seed[] = client.competitors.map((c) => ({
    name: c.name,
    closeness: 9, // tracked = we already deemed them relevant
    competitorId: c.id,
  }));

  // Top up with discovered rivals if we need more to reach `max`.
  if (seeds.length < max) {
    const discovered = (await discoverCompetitors(clientId).catch(() => null)) ?? [];
    const have = new Set(seeds.map((s) => s.name.trim().toLowerCase()));
    for (const d of discovered) {
      if (seeds.length >= max) break;
      if (have.has(d.name.trim().toLowerCase())) continue;
      have.add(d.name.trim().toLowerCase());
      seeds.push({ name: d.name, closeness: d.closeness, competitorId: null });
    }
  }

  const chosen = seeds
    .sort((a, b) => b.closeness - a.closeness)
    .slice(0, max);

  return Promise.all(
    chosen.map(async (s): Promise<CompetitorResearch> => {
      const [researchText, adSamples] = await Promise.all([
        webResearch(
          `Research the brand "${s.name}" in ${geo} as an advertising competitor. Look at their website, Instagram/Facebook ads and posts, and reviews. Summarise concretely: their positioning and price tier, their unique selling proposition, the messaging ANGLES and HOOKS they use in ads, the OFFERS/promotions they run, their brand tone, and any obvious weaknesses a rival could exploit.`
        ),
        s.competitorId
          ? competitorAdSamples(clientId, s.competitorId)
          : Promise.resolve([]),
      ]);
      return {
        name: s.name,
        closeness: s.closeness,
        tracked: Boolean(s.competitorId),
        researchText,
        adSamples,
      };
    })
  );
}
