/**
 * Source-agnostic domain types. The scraper (any Apify Ad Library actor)
 * normalises into `NormalizedAd` so storage, scoring, and UI never depend on a
 * specific actor's output shape — the same pattern the reference project used
 * for Instagram posts.
 */

export type MediaType = "IMAGE" | "VIDEO" | "CAROUSEL" | "REEL" | "UNKNOWN";

export type AdvertiserType = "CLIENT" | "COMPETITOR";

/**
 * A real Meta ad "Library ID" is numeric and ≤16 digits. Longer or non-numeric
 * values (collation ids, or ids some scrapers return that Meta can't resolve)
 * open the "Ad isn't in the ad library" error — so we treat them as unlinkable.
 */
export function isValidArchiveId(id: string | null | undefined): boolean {
  return /^\d{1,16}$/.test(String(id ?? "").trim());
}

/**
 * Canonical Meta Ad Library deep-link for a single ad — the exact format Meta
 * uses for "See ad details", so it opens THAT ad. Returns null when the archive
 * id isn't a resolvable Library ID, so callers can hide the link instead of
 * sending users to a broken page. Always pass the STRING id (never a JS number —
 * ids can exceed 2^53 and lose precision).
 */
export function metaAdUrl(adArchiveId: string | null | undefined): string | null {
  const id = String(adArchiveId ?? "").trim();
  if (!isValidArchiveId(id)) return null;
  return `https://www.facebook.com/ads/library/?id=${id}`;
}

/** One ad as we store it, regardless of which actor produced it. */
export interface NormalizedAd {
  /** Meta ad archive id — dedup key. */
  adArchiveId: string;
  adLibraryUrl: string | null;

  /** The real Facebook page that ran this ad (for accuracy + true link). */
  pageId: string | null;
  pageName: string | null;

  mediaType: MediaType;
  primaryText: string | null;
  headline: string | null;
  description: string | null;
  ctaText: string | null;
  landingUrl: string | null;
  imageUrl: string | null;
  videoUrl: string | null;

  /** When the ad first started running (the longevity signal). */
  startDate: Date | null;
  isActive: boolean;
  /** Total active time in seconds (Ad Library) — a precise longevity signal. */
  totalActiveTimeSec: number | null;
  /** How many ads the Ad Library collated under this one (scaling signal). */
  collationCount: number | null;

  /** Engagement on the linked page post, when the actor surfaces it. */
  likes: number | null;
  comments: number | null;
}

/** Result of scraping one advertiser (a client page or a competitor page). */
export interface AdScrapeResult {
  advertiserName: string;
  fbPageId: string | null;
  ads: NormalizedAd[];
  /** Raw count the actor returned (what we're billed on), pre-dedup. */
  rawCount: number;
}

/** Map a variety of actor "media type" strings to our enum. */
export function mapMediaType(raw?: string | null): MediaType {
  switch ((raw ?? "").toLowerCase()) {
    case "image":
    case "photo":
      return "IMAGE";
    case "video":
      return "VIDEO";
    case "reel":
    case "clips":
      return "REEL";
    case "carousel":
    case "sidecar":
    case "dco":
    case "dpa":
      return "CAROUSEL";
    default:
      return "UNKNOWN";
  }
}

/** Days an ad has been live, from its start date. Null when unknown. */
export function daysLive(startDate: Date | null, now: Date): number | null {
  if (!startDate) return null;
  const ms = now.getTime() - startDate.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}
