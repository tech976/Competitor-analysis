import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { compareTwoAds, type DuelAdInput } from "@/lib/teardown";
import { llmConfigured } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const Body = z.object({
  clientAdId: z.string().min(1),
  competitorAdId: z.string().min(1),
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
  };
}

/** 1-to-1 head-to-head between a client ad and a competitor ad. */
export async function POST(req: Request) {
  if (!llmConfigured()) {
    return NextResponse.json(
      { error: "No LLM configured. Set GROQ_API_KEY to run the 1-to-1 comparison." },
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
      { error: "clientAdId and competitorAdId are required." },
      { status: 400 }
    );
  }

  const [clientAd, competitorAd] = await Promise.all([
    prisma.ad.findUnique({ where: { id: parsed.data.clientAdId } }),
    prisma.ad.findUnique({ where: { id: parsed.data.competitorAdId } }),
  ]);
  if (!clientAd || !competitorAd) {
    return NextResponse.json({ error: "One or both ads not found." }, { status: 404 });
  }

  const context = await prisma.clientContext.findUnique({
    where: { clientId: clientAd.clientId },
  });

  try {
    const result = await compareTwoAds(toInput(clientAd), toInput(competitorAd), {
      industry: context?.industry,
      audience: context?.targetAudience,
      brandVoice: context?.brandVoice,
    });
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Comparison failed." },
      { status: 502 }
    );
  }
}
