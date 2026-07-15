/**
 * Meta Ad Library scraper via Apify (actor: apify/facebook-ads-scraper).
 *
 * The official Ad Library API only exposes political/EU ads, so we scrape the
 * PUBLIC Ad Library web data through the actor (legal for logged-out public
 * data per Meta v. Bright Data, 2024). Field mapping below is locked to the
 * actor's REAL output schema (verified via scripts/probe-apify.mjs):
 *   - top level: adArchiveID, isActive, startDateFormatted, totalActiveTime,
 *     collationCount, pageName, pageId, snapshot
 *   - snapshot: body{text}, title, caption, ctaText, linkUrl, linkDescription,
 *     displayFormat, images[], videos[], cards[]  (all camelCase)
 *   - media lives in snapshot.cards[] (originalImageUrl, videoHdUrl,
 *     videoPreviewImageUrl) and/or snapshot.images[]/videos[].
 */
import { requireApifyToken, env } from "./env";
import { mapMediaType, metaAdUrl, type AdScrapeResult, type MediaType, type NormalizedAd } from "./types";

const APIFY_BASE = "https://api.apify.com/v2";

type TextBlock = { text?: string } | string | undefined;

interface Card {
  body?: TextBlock;
  title?: string;
  caption?: string;
  linkDescription?: string;
  linkUrl?: string;
  ctaText?: string;
  videoHdUrl?: string;
  videoSdUrl?: string;
  videoPreviewImageUrl?: string;
  originalImageUrl?: string;
  resizedImageUrl?: string;
}

interface Snapshot {
  body?: TextBlock;
  title?: string;
  caption?: string;
  linkDescription?: string;
  linkUrl?: string;
  ctaText?: string;
  displayFormat?: string;
  images?: Array<{ originalImageUrl?: string; resizedImageUrl?: string }>;
  videos?: Array<{ videoHdUrl?: string; videoSdUrl?: string; videoPreviewImageUrl?: string }>;
  cards?: Card[];
}

interface ApifyAdItem {
  adArchiveID?: string;
  adArchiveId?: string;
  adId?: string;
  pageName?: string;
  pageId?: string;
  pageID?: string;
  isActive?: boolean;
  startDate?: number | string;
  startDateFormatted?: string;
  totalActiveTime?: number | null;
  collationCount?: number | null;
  snapshot?: Snapshot;
  error?: string;
  errorDescription?: string;
}

function txt(v: TextBlock): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (v && typeof v === "object" && typeof v.text === "string") return v.text.trim() || null;
  return null;
}

function cleanHeadline(v?: string | null): string | null {
  if (!v) return null;
  // Drop dynamic-catalog placeholders like "{{product.name}}".
  if (v.includes("{{")) return null;
  return v.trim() || null;
}

function firstImage(s: Snapshot): string | null {
  for (const im of s.images ?? []) {
    const u = im.originalImageUrl ?? im.resizedImageUrl;
    if (u) return u;
  }
  for (const c of s.cards ?? []) {
    const u = c.originalImageUrl ?? c.resizedImageUrl;
    if (u) return u;
  }
  return null;
}

function firstVideo(s: Snapshot): string | null {
  for (const v of s.videos ?? []) {
    const u = v.videoHdUrl ?? v.videoSdUrl;
    if (u) return u;
  }
  for (const c of s.cards ?? []) {
    const u = c.videoHdUrl ?? c.videoSdUrl;
    if (u) return u;
  }
  return null;
}

function firstVideoPreview(s: Snapshot): string | null {
  for (const v of s.videos ?? []) if (v.videoPreviewImageUrl) return v.videoPreviewImageUrl;
  for (const c of s.cards ?? []) if (c.videoPreviewImageUrl) return c.videoPreviewImageUrl;
  return null;
}

function parseDate(...vals: Array<unknown>): Date | null {
  for (const v of vals) {
    if (v == null) continue;
    if (typeof v === "number") {
      const d = new Date(v < 1e12 ? v * 1000 : v);
      if (!isNaN(d.getTime())) return d;
    }
    if (typeof v === "string" && v.trim()) {
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}

function toNormalizedAd(item: ApifyAdItem): NormalizedAd | null {
  const adArchiveId = item.adArchiveID ?? item.adArchiveId ?? item.adId;
  if (!adArchiveId) return null;
  const s = item.snapshot ?? {};
  const card = s.cards?.[0] ?? {};

  const video = firstVideo(s);
  const image = firstImage(s) ?? firstVideoPreview(s);

  let mediaType: MediaType;
  if (video) mediaType = "VIDEO";
  else if ((s.cards?.length ?? 0) > 1) mediaType = "CAROUSEL";
  else {
    const fromFormat = mapMediaType(s.displayFormat);
    mediaType = fromFormat !== "UNKNOWN" ? fromFormat : image ? "IMAGE" : "UNKNOWN";
  }

  return {
    adArchiveId: String(adArchiveId),
    adLibraryUrl: metaAdUrl(String(adArchiveId)),
    pageId: item.pageId ?? item.pageID ?? null,
    pageName: item.pageName ?? null,
    mediaType,
    primaryText: txt(s.body) ?? txt(card.body),
    headline: cleanHeadline(s.title ?? card.title),
    description: s.linkDescription ?? card.linkDescription ?? s.caption ?? null,
    ctaText: s.ctaText ?? card.ctaText ?? null,
    landingUrl: s.linkUrl ?? card.linkUrl ?? null,
    imageUrl: image,
    videoUrl: video,
    startDate: parseDate(item.startDateFormatted, item.startDate),
    isActive: item.isActive ?? true,
    totalActiveTimeSec: typeof item.totalActiveTime === "number" ? item.totalActiveTime : null,
    collationCount: typeof item.collationCount === "number" ? item.collationCount : null,
    likes: null,
    comments: null,
  };
}

export interface ScrapeOptions {
  resultsLimit?: number;
  country?: string;
  activeOnly?: boolean;
  actor?: string;
  /** When set, scrape ONLY this exact Facebook page (no keyword pollution). */
  pageId?: string;
}

/** Extract a numeric page id from a pasted Ad Library URL or a raw id. */
export function parsePageId(input: string): string | null {
  const s = input.trim();
  if (/^\d{5,}$/.test(s)) return s;
  const m = s.match(/view_all_page_id=(\d+)/) || s.match(/[?&]id=(\d+)/);
  if (m) return m[1];
  // A bare facebook.com/<page> handle can't be resolved to an id here.
  return null;
}

function adLibraryUrl(query: string, opts: ScrapeOptions): string {
  const params = new URLSearchParams({
    active_status: opts.activeOnly === false ? "all" : "active",
    ad_type: "all",
    country: opts.country ?? "IN",
    media_type: "all",
  });
  // Page-scoped scrape is exact; keyword scrape is fuzzy (may pull other pages).
  if (opts.pageId) {
    params.set("view_all_page_id", opts.pageId);
    params.set("search_type", "page");
  } else {
    params.set("q", query);
    params.set("search_type", "keyword_unordered");
  }
  return `https://www.facebook.com/ads/library/?${params.toString()}`;
}

/**
 * Scrape (active) ads for one advertiser by brand name. Uses Apify's
 * synchronous run-sync-get-dataset-items endpoint (good to ~5 min). The input
 * carries several keys (urls/startUrls/searchTerms/count) — the actor needs
 * this fuller set; a leaner input is rejected with HTTP 400.
 */
export async function scrapeAdvertiserAds(
  query: string,
  options: ScrapeOptions = {}
): Promise<AdScrapeResult> {
  const token = requireApifyToken();
  const actor = options.actor ?? env.apifyMetaAdsActor;
  const resultsLimit = options.resultsLimit ?? env.scanResultsLimit;
  const url = adLibraryUrl(query, options);

  const input = {
    urls: [{ url }],
    startUrls: [{ url }],
    // Omit the keyword when scraping an exact page, so the actor stays scoped.
    searchTerms: options.pageId ? [] : [query],
    count: resultsLimit,
    resultsLimit,
    "scrapePageAds.activeStatus": options.activeOnly === false ? "all" : "active",
    country: options.country ?? "IN",
  };

  const endpoint = `${APIFY_BASE}/actors/${actor}/run-sync-get-dataset-items?token=${encodeURIComponent(
    token
  )}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Meta Ad Library scrape failed for "${query}" (HTTP ${res.status}): ${text.slice(0, 300)}`
    );
  }

  const items = (await res.json()) as ApifyAdItem[];
  if (!Array.isArray(items)) {
    throw new Error(`Unexpected actor response for "${query}".`);
  }

  const errorItem = items.find((i) => i.error);
  if (errorItem && items.length === 1) {
    throw new Error(
      `Actor could not scrape "${query}": ${errorItem.errorDescription || errorItem.error}.`
    );
  }

  const ads = items
    .map(toNormalizedAd)
    .filter((a): a is NormalizedAd => a !== null)
    .slice(0, resultsLimit);

  const fbPageId =
    items.find((i) => i.pageId || i.pageID)?.pageId ??
    items.find((i) => i.pageID)?.pageID ??
    null;

  return { advertiserName: query, fbPageId, ads, rawCount: items.length };
}
