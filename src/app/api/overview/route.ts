import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Aggregate KPIs + recent activity for the Dashboard Overview. */
export async function GET() {
  const [totalScans, winningAds, totalCompetitors, totalAds, gapAgg] =
    await Promise.all([
      prisma.scanRun.count(),
      prisma.ad.count({ where: { isProvenWinner: true } }),
      prisma.competitor.count(),
      prisma.ad.count(),
      prisma.comparison.aggregate({ _avg: { gapScore: true } }),
    ]);

  const recentScans = await prisma.scanRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 6,
    include: {
      client: { select: { name: true } },
      comparison: { select: { gapScore: true } },
    },
  });

  // Top competitors by their most recent assessment rating.
  const assessments = await prisma.competitorAssessment.findMany({
    orderBy: { id: "desc" },
    take: 50,
    include: { competitor: { select: { name: true } } },
  });
  const seen = new Set<string>();
  const topCompetitors: Array<{ name: string; rating: number }> = [];
  for (const a of assessments) {
    const name = a.competitor.name;
    if (seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    topCompetitors.push({ name, rating: a.rating });
    if (topCompetitors.length >= 5) break;
  }
  topCompetitors.sort((x, y) => y.rating - x.rating);

  return NextResponse.json({
    kpis: {
      totalScans,
      winningAds,
      avgGapScore: Math.round(gapAgg._avg.gapScore ?? 0),
      totalCompetitors,
      totalAds,
    },
    recentScans: recentScans.map((s) => ({
      id: s.id,
      clientId: s.clientId,
      clientName: s.client.name,
      adsFetched: s.adsFetched,
      gapScore: s.comparison?.gapScore ?? null,
      status: s.status,
      startedAt: s.startedAt,
    })),
    topCompetitors,
  });
}
