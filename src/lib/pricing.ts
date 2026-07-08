/**
 * Cost estimates surfaced in the UI so the team always sees what a scan costs.
 * Scraping is billed per result by the Apify actor; AI analysis is estimated
 * from the number of ads deep-analyzed. These are budgeting figures — actual
 * metered billing may differ.
 */
import { env } from "./env";

/** Estimated Apify spend (USD) for scraping `adCount` ads. */
export function estimateScrapeCost(adCount: number): number {
  return round((adCount / 1000) * env.pricePer1kAds);
}

/**
 * Rough AI cost (USD) for deep-analyzing `winnerCount` winning ads + one
 * synthesis pass. Videos go through Gemini (cheap), synthesis through Claude.
 * ~ $0.02/winner (mix of image+video) + ~$0.12 synthesis.
 */
export function estimateAnalysisCost(winnerCount: number): number {
  return round(winnerCount * 0.02 + 0.12);
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Human label, e.g. "$0.34". */
export function fmtUsd(n: number): string {
  return `$${n.toFixed(n < 1 ? 4 : 2)}`;
}
