import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { metaAdUrl } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Change alerts derived from scan snapshots:
 *  - NEW: competitor ads first seen recently (just launched)
 *  - SCALING: ads whose winning score / creative count rose across scans
 */
/** An ad counts as "just launched" if it has been live this many days or fewer. */
const NEW_AD_MAX_DAYS = 21;

export async function GET() {
  // "New" = recently LAUNCHED on Meta (small days-live), not merely recently
  // seen by our scanner. `firstSeenAt` is when WE first recorded the ad, so an
  // old ad picked up in a fresh scan would wrongly look new — gate on real age.
  const newAdsRaw = await prisma.ad.findMany({
    where: {
      advertiserType: "COMPETITOR",
      daysLiveLatest: { not: null, lte: NEW_AD_MAX_DAYS },
    },
    orderBy: [{ daysLiveLatest: "asc" }, { firstSeenAt: "desc" }],
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
    // Build the deep-link fresh from the archive id (canonical, and fixes any
    // older stored URL). Opens exactly this ad on Meta.
    adLibraryUrl: metaAdUrl(a.adArchiveId),
    // False = this competitor has no FB Page set, so it was matched by keyword —
    // the ad may belong to a different page. UI flags it.
    verifiedPage: Boolean(a.advertiserPageId),
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
