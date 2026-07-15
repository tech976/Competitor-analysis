/**
 * Centralised, lazily-read environment access.
 *
 * The app + UI boot without any keys; each integration calls its `require*`
 * helper and surfaces a clear error only when actually used.
 */

/** All configured Gemini keys, in priority order (rotated on 429 / quota). */
const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
]
  .map((k) => (k ?? "").trim())
  .filter(Boolean);

export const env = {
  apifyToken: process.env.APIFY_TOKEN ?? "",
  apifyMetaAdsActor:
    process.env.APIFY_META_ADS_ACTOR || "apify~facebook-ads-scraper",

  // Groq (OpenAI-compatible) — primary LLM for comparison synthesis.
  // A spare key is used automatically if the first is rate-limited/restricted.
  groqKey: process.env.GROQ_API_KEY ?? "",
  groqKey2: process.env.GROQ_API_KEY_2 ?? "",
  groqModel: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",

  // Anthropic — optional fallback / future multimodal teardowns.
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",

  // Gemini — video analysis + web-grounded research. Supports MULTIPLE keys
  // (GEMINI_API_KEY, _2, _3, _4), rotated round-robin with 429 failover to
  // spread the free-tier quota across projects/accounts.
  geminiKeys: GEMINI_KEYS,
  geminiKey: GEMINI_KEYS[0] ?? "", // back-compat: the first key
  // `gemini-flash-latest` is an always-current alias available to both old and
  // new projects (version-pinned models like 2.5-flash get gated for new keys).
  geminiModel: process.env.GEMINI_MODEL || "gemini-flash-latest",

  pricePer1kAds: Number(process.env.PRICE_PER_1K_ADS || "3.40"),
  winnerDaysThreshold: Number(process.env.WINNER_DAYS_THRESHOLD || "30"),
  scanResultsLimit: Number(process.env.SCAN_RESULTS_LIMIT || "100"),
};

export class MissingCredentialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingCredentialError";
  }
}

export function requireApifyToken(): string {
  if (!env.apifyToken) {
    throw new MissingCredentialError(
      "APIFY_TOKEN is not set. Add it to your .env to scrape the Meta Ad Library."
    );
  }
  return env.apifyToken;
}

export function requireGroqKey(): string {
  if (!env.groqKey) {
    throw new MissingCredentialError(
      "GROQ_API_KEY is not set. Add it to your .env to enable AI comparison & recommendations."
    );
  }
  return env.groqKey;
}

export function requireAnthropicKey(): string {
  if (!env.anthropicKey) {
    throw new MissingCredentialError(
      "ANTHROPIC_API_KEY is not set."
    );
  }
  return env.anthropicKey;
}

export function requireGeminiKey(): string {
  if (env.geminiKeys.length === 0) {
    throw new MissingCredentialError(
      "GEMINI_API_KEY is not set. Add it to your .env to enable deep research & video-ad analysis."
    );
  }
  return env.geminiKeys[0];
}

/** True when a given integration is configured — used to gate UI affordances. */
export const integrations = {
  get apify() {
    return Boolean(env.apifyToken);
  },
  get groq() {
    return Boolean(env.groqKey || env.groqKey2);
  },
  get anthropic() {
    return Boolean(env.anthropicKey);
  },
  get gemini() {
    return env.geminiKeys.length > 0;
  },
  /** Any text-LLM available for the comparison synthesis. */
  get llm() {
    return Boolean(
      env.groqKey || env.groqKey2 || env.geminiKeys.length > 0 || env.anthropicKey
    );
  },
};
