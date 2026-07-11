/**
 * Scan orchestration: scrape the client + every competitor from the Meta Ad
 * Library, persist ads as append-only snapshots, compute the Winning Ad Score,
 * and flag each advertiser's "proven winners".
 *
 * Runs synchronously here (fine for local/dev). In production move this behind
 * a job queue — a full scan can run several minutes across many advertisers.
 */
import crypto from "node:crypto";
import { prisma } from "./db";
import { scrapeAdvertiserAds } from "./apify";
import { daysLive, type NormalizedAd } from "./types";
import { computeWinningScore, pickProvenWinners } from "./winning-score";
import { estimateScrapeCost } from "./pricing";
import { env } from "./env";

/** Stable-ish fingerprint of a creative — same creative across many ads ⇒ scaling. */
function creativeHash(ad: NormalizedAd): string {
  const basis = `${ad.videoUrl ?? ad.imageUrl ?? ""}|${(ad.primaryText ?? "").slice(0, 120)}`;
  return crypto.createHash("sha1").update(basis).digest("hex").slice(0, 16);
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Keyword-scrape fallback filter: keep only ads whose Facebook page name matches
 * the brand (either direction of substring). If nothing matches by name, fall
 * back to the single page with the most ads (best guess). This is a safety net
 * for advertisers that haven't had an exact page set yet — page-scoped scraping
 * is always preferred.
 */
function filterToBrand(ads: NormalizedAd[], ...names: string[]): NormalizedAd[] {
  const targets = names.map(norm).filter((t) => t.length >= 3);
  const matched = ads.filter((a) => {
    if (!a.pageName) return false;
    const p = norm(a.pageName);
    return targets.some((t) => p.includes(t) || t.includes(p));
  });
  if (matched.length > 0) return matched;

  // No name match — keep the dominant page's ads only.
  const counts = new Map<string, number>();
  for (const a of ads) {
    const id = a.pageId ?? "?";
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = -1;
  for (const [id, n] of counts) {
    if (n > bestCount) {
      bestCount = n;
      best = id;
    }
  }
  return best ? ads.filter((a) => (a.pageId ?? "?") === best) : ads;
}

export interface ScanSummary {
  scanRunId: string;
  adsFetched: number;
  winners: number;
  scrapeCost: number;
}

export async function runScan(clientId: string): Promise<ScanSummary> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { competitors: true, context: true },
  });
  if (!client) throw new Error("Client not found.");

  // Recover scans that died mid-run (e.g. a serverless timeout) so the UI and
  // dashboard don't show "running" forever.
  await prisma.scanRun.updateMany({
    where: {
      status: { in: ["RUNNING", "PENDING"] },
      startedAt: { lt: new Date(Date.now() - 15 * 60_000) },
    },
    data: { status: "FAILED", error: "Scan interrupted or timed out.", finishedAt: new Date() },
  });

  const run = await prisma.scanRun.create({
    data: { clientId, status: "RUNNING" },
  });
  const now = new Date();
  let adsFetched = 0;
  let rawTotal = 0;
  let winners = 0;

  try {
    // Advertiser list = the client's own page + each competitor.
    const advertisers: Array<{
      name: string;
      query: string;
      pageId: string | null;
      type: "CLIENT" | "COMPETITOR";
      competitorId?: string;
    }> = [
      {
        name: client.name,
        query: client.fbPageName ?? client.name,
        pageId: client.fbPageId ?? null,
        type: "CLIENT",
      },
    ];
    for (const c of client.competitors) {
      advertisers.push({
        name: c.name,
        query: c.fbPageName ?? c.name,
        pageId: c.fbPageId ?? null,
        type: "COMPETITOR",
        competitorId: c.id,
      });
    }

    const advErrors: string[] = [];
    for (const adv of advertisers) {
     try {
      const result = await scrapeAdvertiserAds(adv.query, {
        country: "IN",
        resultsLimit: env.scanResultsLimit,
        pageId: adv.pageId ?? undefined,
      });
      rawTotal += result.rawCount;

      // Page-scoped scrapes are already clean. Name-only (keyword) scrapes can
      // pull unrelated advertisers, so keep just the page that best matches the
      // brand — this strips out keyword-search pollution.
      const filtered = adv.pageId
        ? result.ads
        : filterToBrand(result.ads, adv.query, adv.name);
      // Dedupe by ad id — the actor can return the same ad twice (pagination /
      // collation), which would violate the (adId, scanRun) unique on the
      // observation and abort the rest of this advertiser's ads.
      const seenArchive = new Set<string>();
      const ads = filtered.filter((a) => {
        if (seenArchive.has(a.adArchiveId)) return false;
        seenArchive.add(a.adArchiveId);
        return true;
      });

      // Count how many ads share each creative (a scaling signal we derive
      // ourselves; the actor's `collationCount` is preferred when present).
      const hashes = ads.map(creativeHash);
      const counts = new Map<string, number>();
      hashes.forEach((h) => counts.set(h, (counts.get(h) ?? 0) + 1));

      const scored: Array<{ ad: string; score: number }> = [];

      for (let i = 0; i < ads.length; i++) {
        const ad = ads[i];
        const hash = hashes[i];
        // Prefer the Ad Library's exact active-time when present.
        const dl =
          ad.totalActiveTimeSec != null
            ? Math.floor(ad.totalActiveTimeSec / 86_400)
            : daysLive(ad.startDate, now);

        const row = await prisma.ad.upsert({
          where: {
            clientId_advertiserName_adArchiveId: {
              clientId,
              advertiserName: adv.name,
              adArchiveId: ad.adArchiveId,
            },
          },
          create: {
            clientId,
            advertiserType: adv.type,
            competitorId: adv.competitorId,
            advertiserName: adv.name,
            advertiserPageId: ad.pageId,
            advertiserPageName: ad.pageName,
            adArchiveId: ad.adArchiveId,
            adLibraryUrl: ad.adLibraryUrl,
            mediaType: ad.mediaType,
            primaryText: ad.primaryText,
            headline: ad.headline,
            description: ad.description,
            ctaText: ad.ctaText,
            landingUrl: ad.landingUrl,
            imageUrl: ad.imageUrl,
            videoUrl: ad.videoUrl,
            creativeHash: hash,
            startDate: ad.startDate,
            firstSeenAt: now,
            lastSeenAt: now,
            isActiveLatest: ad.isActive,
            daysLiveLatest: dl,
          },
          update: {
            lastSeenAt: now,
            isActiveLatest: ad.isActive,
            daysLiveLatest: dl,
            advertiserPageId: ad.pageId ?? undefined,
            advertiserPageName: ad.pageName ?? undefined,
            creativeHash: hash,
            mediaType: ad.mediaType,
            primaryText: ad.primaryText ?? undefined,
            headline: ad.headline ?? undefined,
            ctaText: ad.ctaText ?? undefined,
            imageUrl: ad.imageUrl ?? undefined,
            videoUrl: ad.videoUrl ?? undefined,
            startDate: ad.startDate ?? undefined,
          },
        });

        // Survival streak ≈ how many scans we've already seen this ad in, +1.
        const prior = await prisma.adObservation.count({ where: { adId: row.id } });
        const deploymentCount =
          ad.collationCount && ad.collationCount > 0
            ? ad.collationCount
            : counts.get(hash) ?? 1;
        const score = computeWinningScore({
          daysLive: dl,
          isActive: ad.isActive,
          deploymentCount,
          likes: ad.likes,
          comments: ad.comments,
          survivalStreak: prior + 1,
        });

        await prisma.adObservation.create({
          data: {
            adId: row.id,
            scanRunId: run.id,
            observedAt: now,
            isActive: ad.isActive,
            daysLive: dl,
            deploymentCount,
            likes: ad.likes,
            comments: ad.comments,
            winningScore: score,
          },
        });
        await prisma.ad.update({ where: { id: row.id }, data: { winningScore: score } });
        scored.push({ ad: row.id, score });
        adsFetched += 1;
      }

      // Flag this advertiser's proven winners (reset first so it's idempotent).
      const winnerSet = pickProvenWinners(scored);
      await prisma.ad.updateMany({
        where: { clientId, advertiserName: adv.name },
        data: { isProvenWinner: false },
      });
      for (const adId of winnerSet) {
        await prisma.ad.update({ where: { id: adId }, data: { isProvenWinner: true } });
        winners += 1;
      }

      // Purge stale pollution: for a page-scoped advertiser, drop any of its
      // stored ads that were NOT re-seen this scan AND belong to a different or
      // unknown page (from older keyword scans). Keyed on advertiser ROLE, not
      // the name string, since the name may have changed between scans.
      if (adv.pageId) {
        await prisma.ad.deleteMany({
          where: {
            clientId,
            ...(adv.type === "CLIENT"
              ? { advertiserType: "CLIENT" }
              : { competitorId: adv.competitorId }),
            lastSeenAt: { lt: now },
            OR: [{ advertiserPageId: null }, { advertiserPageId: { not: adv.pageId } }],
          },
        });
      }
     } catch (e) {
       // One advertiser failing (bad name, no ads, rate limit) shouldn't kill
       // the whole scan — record it and carry on with the rest.
       advErrors.push(`${adv.name}: ${e instanceof Error ? e.message : String(e)}`);
     }
    }

    const scrapeCost = estimateScrapeCost(rawTotal);
    await prisma.scanRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCEEDED",
        adsFetched,
        scrapeCost,
        error: advErrors.length ? advErrors.join(" | ") : null,
        finishedAt: new Date(),
      },
    });

    return { scanRunId: run.id, adsFetched, winners, scrapeCost };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.scanRun.update({
      where: { id: run.id },
      data: { status: "FAILED", error: message, finishedAt: new Date() },
    });
    throw err;
  }
}
