/** Shapes returned by the API routes, for the UI. */

export interface ScanRunLite {
  id: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
  startedAt: string;
  finishedAt: string | null;
  adsFetched: number;
  scrapeCost: number;
  error: string | null;
}

export interface ClientContextLite {
  industry: string | null;
  targetAudience: string | null;
  usp: string | null;
  brandVoice: string | null;
  goals: string | null;
}

export interface ClientListItem {
  id: string;
  name: string;
  fbPageName: string | null;
  context: ClientContextLite | null;
  _count: { competitors: number; ads: number };
  scanRuns: ScanRunLite[];
  createdAt: string;
}

export interface DiscoveredCompetitor {
  name: string;
  closeness: number;
  why: string;
  alreadyAdded: boolean;
}

export interface CompetitorLite {
  id: string;
  name: string;
  fbPageId: string | null;
  fbPageName: string | null;
  igHandle: string | null;
}

export type Mark = "LEAD" | "PAR" | "BEHIND";

export interface ComparisonDimensionLite {
  id: string;
  dimension: string;
  clientScore: number | null;
  competitorBestScore: number | null;
  mark: Mark;
  reasoning: string | null;
  fix: string | null;
}

export interface CompetitorAssessmentLite {
  id: string;
  competitorId: string;
  rating: number;
  summary: string | null;
  topStrength: string | null;
  winnerCount: number;
  competitor: CompetitorLite;
}

export interface ComparisonLite {
  id: string;
  gapScore: number | null;
  tldr: string | null;
  overallSummary: string | null;
  lackingSummary: string | null;
  salesGrowthPlan: string | null;
  suggestions: string | null;
  dimensions: ComparisonDimensionLite[];
  competitors: CompetitorAssessmentLite[];
}

export interface ClientDetail {
  id: string;
  name: string;
  fbPageId: string | null;
  fbPageName: string | null;
  context: (ClientContextLite & { geography: string | null }) | null;
  competitors: CompetitorLite[];
  scanRuns: Array<ScanRunLite & { comparison: ComparisonLite | null }>;
}

export type DimKey =
  | "hook"
  | "visuals"
  | "offer"
  | "cta"
  | "emotion"
  | "socialProof"
  | "branding"
  | "persuasion"
  | "storytelling"
  | "trust";

export interface DuelSide {
  scores: Record<DimKey, number>;
  overall: number;
  persuasionAngle: string;
  offerType: string;
  daysLive: number | null;
  winningScore: number | null;
}

export interface DuelResult {
  dims: Array<{ key: DimKey; label: string }>;
  client: DuelSide;
  competitor: DuelSide;
  winners: Record<DimKey, "CLIENT" | "COMPETITOR" | "TIE">;
  notes: Partial<Record<DimKey, string>>;
  whyCompetitorWins: string[];
  whereClientLosing: string[];
  immediateFixes: string[];
  verdict: string;
  overallWinner: "CLIENT" | "COMPETITOR" | "TIE";
}

export interface AspectMeta {
  key: string;
  label: string;
  desc: string;
}

export interface ColumnScore {
  score: number;
  note: string | null;
  na: boolean;
}

export interface CompareColumn {
  adId: string;
  advertiserName: string;
  isClient: boolean;
  overall: number;
  label: string;
  scores: Record<string, ColumnScore>;
}

export interface ColumnsInsights {
  vsAdId: string;
  vsName: string;
  whyTheyWin: string[];
  whereYouLose: string[];
  immediateFixes: string[];
  verdict: string;
}

export interface ColumnsResult {
  aspects: AspectMeta[];
  columns: CompareColumn[];
  insights: ColumnsInsights | null;
}

// ── Ad Copy Studio ───────────────────────────────────────────────────────────

export interface ClientDossierLite {
  brand: string;
  oneLiner: string;
  usp: string;
  offerings: string[];
  audience: string;
  positioning: string;
  priceTier: string;
  tone: string;
  proofPoints: string[];
  differentiators: string[];
  keyMessages: string[];
  objections: string[];
  industry: string;
  geography: string;
  sources: string[];
}

export interface CompetitorIntelLite {
  name: string;
  closeness: number;
  positioning: string;
  priceTier: string;
  tone: string;
  angles: string[];
  hooks: string[];
  offers: string[];
  weaknesses: string[];
}

export interface HeadlineGroupLite {
  angle: string;
  intent: string;
  headlines: Array<{ text: string; rationale: string }>;
}

export interface AdConceptLite {
  name: string;
  angle: string;
  headline: string;
  primaryText: string;
  cta: string;
  whyItBeatsCompetitors: string;
}

export interface AdCopyOutputLite {
  strategy: {
    summary: string;
    positioningVsCompetitors: string;
    whitespace: string[];
  };
  competitorIntel: CompetitorIntelLite[];
  headlineGroups: HeadlineGroupLite[];
  concepts: AdConceptLite[];
}

export interface AdCopyResultLite {
  runId: string;
  clientDossier: ClientDossierLite;
  output: AdCopyOutputLite;
}

export interface AdCopyRunSummary {
  id: string;
  status: "RUNNING" | "SUCCEEDED" | "FAILED";
  goal: string | null;
  website: string | null;
  createdAt: string;
  finishedAt: string | null;
  headlineCount: number;
  error: string | null;
}

/** A persisted run row as returned by GET ?runId= / the `latest` field. */
export interface AdCopyRunFull {
  id: string;
  clientId: string;
  status: "RUNNING" | "SUCCEEDED" | "FAILED";
  website: string | null;
  goal: string | null;
  clientDossier: ClientDossierLite | null;
  output: AdCopyOutputLite | null;
  createdAt: string;
  finishedAt: string | null;
  error: string | null;
}

export interface AdLite {
  id: string;
  advertiserType: "CLIENT" | "COMPETITOR";
  advertiserName: string;
  advertiserPageName: string | null;
  competitorId: string | null;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL" | "REEL" | "UNKNOWN";
  primaryText: string | null;
  headline: string | null;
  ctaText: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  adLibraryUrl: string | null;
  daysLiveLatest: number | null;
  isActiveLatest: boolean;
  winningScore: number | null;
  isProvenWinner: boolean;
  analysis: { whyItWorks: string | null; overallScore: number | null } | null;
}
