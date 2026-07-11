import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Change alerts derived from scan snapshots:
 *  - NEW: competitor ads first seen recently (just launched)
 *  - SCALING: ads whose winning score / creative count rose across scans
 */
export async function GET() {
  const since = new Date(Date.now() - 21 * 86_400_000); // ~3 weeks

  const newAdsRaw = await prisma.ad.findMany({
    where: { advertiserType: "COMPETITOR", firstSeenAt: { gte: since } },
    orderBy: [{ isProvenWinner: "desc" }, { firstSeenAt: "desc" }],
    take: 24,
    include: { client: { select: { id: true, name: true } } },
  });

  const withObs = await prisma.ad.findMany({
    where: { advertiserType: "COMPETITOR" },
    orderBy: { winningScore: "desc" },
    take: 300,
    include: {
      client: { select: { id: true, name: true } },
      observations: { orderBy: { observedAt: "asc" }, select: { winningScore: true, deploymentCount: true } },
    },
  });

  const summary = (a: (typeof newAdsRaw)[number]) => ({
    id: a.id,
    advertiserName: a.advertiserName,
    advertiserPageName: a.advertiserPageName,
    clientId: a.clientId,
    clientName: a.client.name,
    mediaType: a.mediaType,
    headline: a.headline,
    daysLive: a.daysLiveLatest,
    winningScore: a.winningScore,
    isProvenWinner: a.isProvenWinner,
    imageUrl: a.imageUrl,
    adLibraryUrl: a.adLibraryUrl,
    firstSeenAt: a.firstSeenAt,
  });

  const rising: Array<ReturnType<typeof summary> & { scoreDelta: number; deployDelta: number }> = [];
  for (const a of withObs) {
    if (a.observations.length < 2) continue;
    const first = a.observations[0];
    const last = a.observations[a.observations.length - 1];
    const scoreDelta = Math.round((last.winningScore ?? 0) - (first.winningScore ?? 0));
    const deployDelta = (last.deploymentCount ?? 1) - (first.deploymentCount ?? 1);
    if (scoreDelta >= 12 || deployDelta >= 2) {
      rising.push({ ...summary(a), scoreDelta, deployDelta });
    }
  }
  rising.sort((x, y) => y.scoreDelta - x.scoreDelta);

  return NextResponse.json({
    newAds: newAdsRaw.map(summary),
    rising: rising.slice(0, 20),
  });
}
