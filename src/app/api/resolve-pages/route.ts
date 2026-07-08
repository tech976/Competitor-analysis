import { NextResponse } from "next/server";
import { scrapeAdvertiserAds } from "@/lib/apify";
import { MissingCredentialError } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Resolve a brand name → the distinct Facebook pages advertising under it, so
 * the user can pick the EXACT advertiser (kills keyword-search pollution).
 * GET /api/resolve-pages?q=Mamaearth
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "q is required." }, { status: 400 });
  }

  try {
    const result = await scrapeAdvertiserAds(q, { resultsLimit: 30, country: "IN" });

    const map = new Map<
      string,
      { pageId: string; pageName: string | null; adCount: number; sample: string | null }
    >();
    for (const ad of result.ads) {
      if (!ad.pageId) continue;
      const cur =
        map.get(ad.pageId) ??
        { pageId: ad.pageId, pageName: ad.pageName, adCount: 0, sample: ad.imageUrl };
      cur.adCount += 1;
      if (!cur.pageName && ad.pageName) cur.pageName = ad.pageName;
      if (!cur.sample && ad.imageUrl) cur.sample = ad.imageUrl;
      map.set(ad.pageId, cur);
    }

    const pages = [...map.values()].sort((a, b) => b.adCount - a.adCount);
    return NextResponse.json({ pages });
  } catch (err) {
    if (err instanceof MissingCredentialError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Resolve failed." },
      { status: 502 }
    );
  }
}
