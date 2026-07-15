import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env, integrations } from "@/lib/env";
import { llmProvider } from "@/lib/llm";

export const dynamic = "force-dynamic";

/** System status + configuration (no secrets) for the Settings page. */
export async function GET() {
  const [clients, competitors, ads, scans, agency] = await Promise.all([
    prisma.client.count(),
    prisma.competitor.count(),
    prisma.ad.count(),
    prisma.scanRun.count(),
    prisma.agency.findFirst({ select: { name: true } }),
  ]);

  return NextResponse.json({
    integrations: {
      apify: integrations.apify,
      groq: integrations.groq,
      gemini: integrations.gemini,
      anthropic: integrations.anthropic,
      llm: integrations.llm,
    },
    llm: {
      activeProvider: llmProvider(),
      geminiModel: env.geminiModel,
      geminiKeyCount: env.geminiKeys.length,
      anthropicModel: env.anthropicModel,
      groqModel: env.groqModel,
    },
    tuning: {
      winnerDaysThreshold: env.winnerDaysThreshold,
      scanResultsLimit: env.scanResultsLimit,
      pricePer1kAds: env.pricePer1kAds,
    },
    workspace: {
      agency: agency?.name ?? null,
      clients,
      competitors,
      ads,
      scans,
    },
  });
}
