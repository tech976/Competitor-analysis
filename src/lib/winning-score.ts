/**
 * Winning Ad Score — quantifies how likely an ad is a real performance winner,
 * beyond the eyeball "it's been running a while" heuristic.
 *
 * Composite of four signals (see CREATIVE-ANALYSIS-ENGINE.md):
 *   longevity (~40%) + still-active (~15%) + scaling/duplication (~30%)
 *   + engagement (~15%), with a bonus for surviving across our own scans.
 *
 * Score is 0–100. We then flag the top ads per advertiser as "Proven Winners"
 * — only those get deep (expensive) AI analysis.
 */
import { env } from "./env";

export interface WinningSignals {
  /** Days the ad has been live (today − start date). */
  daysLive: number | null;
  /** Is it still running right now. */
  isActive: boolean;
  /** How many ads share this creative (scaling = budget behind it). */
  deploymentCount: number;
  /** Engagement on the linked post, when available. */
  likes: number | null;
  comments: number | null;
  /** Consecutive scans of ours in which this ad was still alive. */
  survivalStreak: number;
}

const WEIGHTS = {
  longevity: 0.4,
  active: 0.15,
  scaling: 0.3,
  engagement: 0.15,
};

/** Saturating curve → 0..1. `half` is the value that yields ~0.5. */
function saturate(value: number, half: number): number {
  if (value <= 0) return 0;
  return value / (value + half);
}

export function computeWinningScore(s: WinningSignals): number {
  // Longevity: 30 days ≈ 0.5, 90 days ≈ 0.75. Strongest single signal.
  const longevity = s.daysLive == null ? 0 : saturate(s.daysLive, env.winnerDaysThreshold);

  // Still active is a simple but meaningful boolean.
  const active = s.isActive ? 1 : 0.2;

  // Scaling: 1 deployment = baseline; 4+ copies of the same creative = strong.
  const scaling = saturate(Math.max(0, s.deploymentCount - 1), 3);

  // Engagement: likes weighted + comments weighted (comments are higher-intent).
  const eng = (s.likes ?? 0) + (s.comments ?? 0) * 3;
  const engagement = saturate(eng, 500);

  const base =
    WEIGHTS.longevity * longevity +
    WEIGHTS.active * active +
    WEIGHTS.scaling * scaling +
    WEIGHTS.engagement * engagement;

  // Survival bonus: each extra consecutive scan alive adds up to +10% (capped).
  const survivalBonus = Math.min(0.1, Math.max(0, s.survivalStreak - 1) * 0.04);

  return Math.round(Math.min(1, base + survivalBonus) * 100);
}

export interface ScoredAd<T> {
  ad: T;
  score: number;
}

/**
 * Score a list of ads and flag the proven winners. An ad is a "winner" if it
 * clears the score floor; we also always keep the top `topN` so a thin
 * competitor still yields something to analyze.
 */
export function pickProvenWinners<T>(
  scored: ScoredAd<T>[],
  opts: { scoreFloor?: number; topN?: number } = {}
): Set<T> {
  const scoreFloor = opts.scoreFloor ?? 55;
  const topN = opts.topN ?? 8;

  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const winners = new Set<T>();

  for (const { ad, score } of sorted) {
    if (score >= scoreFloor) winners.add(ad);
  }
  // Guarantee at least the top N (even if below floor) so analysis isn't empty.
  for (const { ad } of sorted.slice(0, topN)) winners.add(ad);

  return winners;
}
