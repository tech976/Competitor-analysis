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

  // Top competitors by their BEST rating across all assessments.
  const assessments = await prisma.competitorAssessment.findMany({
    orderBy: { id: "desc" },
    take: 300,
    include: { competitor: { select: { name: true } } },
  });
  const byName = new Map<string, { name: string; rating: number }>();
  for (const a of assessments) {
    const key = a.competitor.name.toLowerCase();
    const cur = byName.get(key);
    if (!cur || a.rating > cur.rating) byName.set(key, { name: a.competitor.name, rating: a.rating });
  }
  const topCompetitors = [...byName.values()].sort((x, y) => y.rating - x.rating).slice(0, 5);

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
