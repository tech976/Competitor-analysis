import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { compareAdColumns, type DuelAdInput } from "@/lib/teardown";
import { llmConfigured } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const Body = z.object({
  clientAdId: z.string().min(1),
  competitorAdIds: z.array(z.string().min(1)).min(1).max(3),
});

function toInput(a: {
  id: string;
  advertiserName: string;
  mediaType: string;
  daysLiveLatest: number | null;
  winningScore: number | null;
  headline: string | null;
  primaryText: string | null;
  ctaText: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
}): DuelAdInput {
  return {
    id: a.id,
    advertiserName: a.advertiserName,
    mediaType: a.mediaType,
    daysLive: a.daysLiveLatest,
    winningScore: a.winningScore,
    headline: a.headline,
    primaryText: a.primaryText,
    ctaText: a.ctaText,
    imageUrl: a.imageUrl,
    videoUrl: a.videoUrl,
  };
}

/** Multi-column comparison: your ad vs up to 3 competitor ads. */
export async function POST(req: Request) {
  if (!llmConfigured()) {
    return NextResponse.json(
      { error: "No LLM configured. Set GROQ_API_KEY to run the comparison." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "clientAdId and 1-3 competitorAdIds are required." },
      { status: 400 }
    );
  }

  const clientAd = await prisma.ad.findUnique({ where: { id: parsed.data.clientAdId } });
  if (!clientAd) {
    return NextResponse.json({ error: "Client ad not found." }, { status: 404 });
  }
  const competitorAds = await prisma.ad.findMany({
    where: { id: { in: parsed.data.competitorAdIds } },
  });
  if (competitorAds.length === 0) {
    return NextResponse.json({ error: "No competitor ads found." }, { status: 404 });
  }

  const context = await prisma.clientContext.findUnique({
    where: { clientId: clientAd.clientId },
  });

  try {
    const result = await compareAdColumns(
      toInput(clientAd),
      competitorAds.map(toInput),
      { industry: context?.industry, audience: context?.targetAudience, brandVoice: context?.brandVoice }
    );
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Comparison failed." },
      { status: 502 }
    );
  }
}
