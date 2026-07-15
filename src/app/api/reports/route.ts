import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Report payload for a client: KPIs + the latest completed gap-analysis
 * comparison (shaped as ComparisonLite so the UI reuses <ComparisonView/>).
 */
export async function GET(req: Request) {
  const clientId = new URL(req.url).searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId is required." }, { status: 400 });
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { context: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  const run = await prisma.scanRun.findFirst({
    where: { clientId, comparison: { isNot: null } },
    orderBy: { startedAt: "desc" },
    include: {
      comparison: {
        include: {
          dimensions: true,
          competitors: { include: { competitor: true } },
        },
      },
    },
  });

  const [winners, competitors, totalAds] = await Promise.all([
    prisma.ad.count({
      where: { clientId, isProvenWinner: true, advertiserType: "COMPETITOR" },
    }),
    prisma.competitor.count({ where: { clientId } }),
    prisma.ad.count({ where: { clientId } }),
  ]);

  const cmp = run?.comparison ?? null;
  const comparison = cmp
    ? {
        id: cmp.id,
        gapScore: cmp.gapScore,
        tldr: cmp.tldr,
        overallSummary: cmp.overallSummary,
        lackingSummary: cmp.lackingSummary,
        salesGrowthPlan: cmp.salesGrowthPlan,
        suggestions: cmp.suggestions,
        dimensions: cmp.dimensions.map((d) => ({
          id: d.id,
          dimension: d.dimension,
          clientScore: d.clientScore,
          competitorBestScore: d.competitorBestScore,
          mark: d.mark,
          reasoning: d.reasoning,
          fix: d.fix,
        })),
        competitors: cmp.competitors.map((a) => ({
          id: a.id,
          competitorId: a.competitorId,
          rating: a.rating,
          summary: a.summary,
          topStrength: a.topStrength,
          winnerCount: a.winnerCount,
          competitor: {
            id: a.competitor.id,
            name: a.competitor.name,
            fbPageId: a.competitor.fbPageId,
            fbPageName: a.competitor.fbPageName,
            igHandle: a.competitor.igHandle,
          },
        })),
      }
    : null;

  return NextResponse.json({
    client: {
      id: client.id,
      name: client.name,
      industry: client.context?.industry ?? null,
      geography: client.context?.geography ?? null,
    },
    kpis: {
      gapScore: cmp?.gapScore ?? null,
      competitorWinners: winners,
      competitors,
      totalAds,
      generatedAt: run?.finishedAt ?? run?.startedAt ?? null,
    },
    comparison,
  });
}
