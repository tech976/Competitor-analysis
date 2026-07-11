/**
 * Competitor discovery — given a client's brand context, ask the LLM for the
 * closest DIRECT competitors that advertise on Meta, ranked by how head-to-head
 * they are. Returns ready-to-add suggestions; the team picks which to track.
 */
import { prisma } from "./db";
import { completeJson, llmConfigured } from "./llm";

export interface DiscoveredCompetitor {
  name: string;
  /** 1–10, how directly they compete (10 = head-to-head rival). */
  closeness: number;
  /** Short reason they're a competitor. */
  why: string;
  /** Already tracked for this client. */
  alreadyAdded: boolean;
}

function clamp(n: unknown): number {
  return Math.max(1, Math.min(10, Math.round(Number(n) || 5)));
}

export async function discoverCompetitors(
  clientId: string
): Promise<DiscoveredCompetitor[] | null> {
  if (!llmConfigured()) return null;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { context: true, competitors: true },
  });
  if (!client) throw new Error("Client not found.");

  const ctx = client.context;
  const existing = new Set(client.competitors.map((c) => c.name.trim().toLowerCase()));

  const prompt = `You are a competitive-intelligence analyst for a digital marketing agency. List the CLOSEST direct competitors of the brand below — real, well-known brands that actively run Meta (Facebook/Instagram) ads in ${ctx?.geography ?? "India"}.

BRAND
- name: ${client.name}
- industry: ${ctx?.industry ?? "unknown"}
- target audience: ${ctx?.targetAudience ?? "unknown"}
- USP / positioning: ${ctx?.usp ?? "unknown"}
- products: ${ctx?.products ?? "unknown"}

Pick brands in the SAME category, with a similar audience and price positioning, that this brand would realistically lose customers to. Prefer direct, head-to-head rivals over broad/aspirational ones.

Return JSON:
{ "competitors": [ { "name": "<exact brand name>", "closeness": <1-10, 10 = head-to-head rival>, "why": "<=12 words on why they compete" }, ... up to 10, most direct first ] }
Do not include the brand itself. Only real brands that advertise on Meta. JSON only.`;

  const ai = await completeJson<{ competitors: Array<{ name?: string; closeness?: number; why?: string }> }>(
    prompt,
    { maxTokens: 1300 }
  );

  const seen = new Set<string>();
  const out: DiscoveredCompetitor[] = [];
  for (const c of ai.competitors ?? []) {
    const name = (c.name ?? "").trim();
    const key = name.toLowerCase();
    if (!name || key === client.name.trim().toLowerCase()) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name,
      closeness: clamp(c.closeness),
      why: (c.why ?? "").trim(),
      alreadyAdded: existing.has(key),
    });
  }
  out.sort((a, b) => b.closeness - a.closeness);
  return out.slice(0, 10);
}
