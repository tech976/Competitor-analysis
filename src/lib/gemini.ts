/**
 * Server-side Gemini client — deep VIDEO ad analysis. Gemini natively ingests
 * a video (frames + audio) in one call, so it genuinely "watches" the whole
 * ad: hook, pacing, on-screen text, voiceover, music, CTA timing.
 *
 * Small videos (≲20MB) go inline as base64 here. For larger files, switch to
 * the Gemini File API (upload → reference by file uri) — left as a follow-up.
 *
 * SERVER-ONLY. Returns the structured Creative Teardown for a video; Claude
 * still does the final cross-ad comparison & recommendations.
 */
import { env, requireGeminiKey } from "./env";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** The teardown schema we ask the model to fill (see CREATIVE-ANALYSIS-ENGINE.md). */
export const TEARDOWN_INSTRUCTION = `Watch this ad in full and analyse what makes it work, as a performance-marketing strategist. Return JSON with exactly these keys:
{
  "format": "VIDEO",
  "hook": { "what": string, "strength": 0-10, "why": string },
  "visual_style": { "desc": string, "score": 0-10 },
  "on_screen_text": { "extracted": string, "assessment": string, "score": 0-10 },
  "script_voiceover": { "transcript": string, "tone": string, "score": 0-10 },
  "audio": { "music_or_vo": string, "trending_sound": boolean },
  "offer": { "what": string, "clarity": 0-10, "when_shown": string },
  "cta": { "text": string, "strength": 0-10 },
  "persuasion_angle": { "technique": string, "score": 0-10 },
  "social_proof": { "present": boolean, "what": string },
  "branding": { "consistent": boolean, "notes": string },
  "why_it_works": string,
  "overall_score": 0-100
}
JSON only. No prose, no markdown fences.`;

async function fetchAsBase64(
  url: string
): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to download media (${res.status}).`);
  const mimeType = res.headers.get("content-type") ?? "video/mp4";
  const buf = Buffer.from(await res.arrayBuffer());
  return { data: buf.toString("base64"), mimeType };
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

// Round-robin cursor so request bursts spread across keys instead of always
// hammering key #1 first.
let keyCursor = 0;

/**
 * POST a generateContent body to Gemini, rotating across ALL configured keys.
 * Starts at a round-robin offset (spreads load) and, on a 429/500/503, fails
 * over to the next key. Throws only if EVERY key fails — so one exhausted
 * free-tier key can't break the feature on its own.
 */
async function callGemini(
  body: Record<string, unknown>
): Promise<GeminiResponse> {
  const keys = env.geminiKeys;
  if (keys.length === 0) requireGeminiKey(); // throws a clear MissingCredentialError
  const n = keys.length;
  const start = keyCursor++ % n;
  let lastError = "";
  for (let i = 0; i < n; i++) {
    const key = keys[(start + i) % n];
    const url = `${GEMINI_BASE}/models/${env.geminiModel}:generateContent?key=${encodeURIComponent(
      key
    )}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      continue; // network blip — try the next key
    }
    if (res.ok) return (await res.json()) as GeminiResponse;
    const text = await res.text().catch(() => "");
    lastError = `Gemini API error ${res.status}: ${text.slice(0, 300) || res.statusText}`;
    // Rotate only on quota/rate/transient errors; a 400/404 won't fix itself.
    if (res.status === 429 || res.status === 500 || res.status === 503) continue;
    throw new Error(lastError);
  }
  throw new Error(lastError || "All Gemini keys exhausted.");
}

function extractText(data: GeminiResponse): string {
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
}

/** Low-level: send parts to Gemini generateContent (JSON mode) and return text. */
async function generate(
  parts: Array<Record<string, unknown>>
): Promise<string> {
  const data = await callGemini({
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
  });
  return extractText(data);
}

/** Text-only generation (JSON) — used as an LLM fallback when Groq is down. */
export async function geminiText(prompt: string): Promise<string> {
  return generate([{ text: prompt }]);
}

/**
 * Grounded generation — Gemini with Google Search enabled, so the model reads
 * the LIVE web (brand sites, socials, reviews, news, marketplaces) before it
 * answers. This is what lets our research agents actually "go and look" rather
 * than rely on stale training memory.
 *
 * Grounding is incompatible with forced JSON mime-type, so this returns free
 * TEXT — callers that need structured data run it through completeJson() after.
 * Throws if grounding is unavailable on the key/model; callers should fall back
 * to ungrounded generation so the feature degrades gracefully instead of dying.
 */
export async function geminiGrounded(prompt: string): Promise<string> {
  const data = await callGemini({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.4 },
  });
  return extractText(data);
}

/** Low-level multimodal generation — pass a mix of {text} and image parts. */
export async function geminiGenerate(
  parts: Array<Record<string, unknown>>
): Promise<string> {
  return generate(parts);
}

/** Download an image URL into a Gemini inline image part; null on failure. */
export async function fetchImagePart(
  url: string
): Promise<Record<string, unknown> | null> {
  try {
    const { data, mimeType } = await fetchAsBase64(url);
    return {
      inline_data: {
        mime_type: mimeType.startsWith("image/") ? mimeType : "image/jpeg",
        data,
      },
    };
  } catch {
    return null;
  }
}

/** Analyse a video ad end-to-end → parsed teardown JSON. */
export async function analyzeVideoAd(videoUrl: string): Promise<unknown> {
  const { data, mimeType } = await fetchAsBase64(videoUrl);
  const raw = await generate([
    { inline_data: { mime_type: mimeType, data } },
    { text: TEARDOWN_INSTRUCTION },
  ]);
  return parseJson(raw);
}

/** Analyse a static image/poster ad → parsed teardown JSON. */
export async function analyzeImageAd(imageUrl: string): Promise<unknown> {
  const { data, mimeType } = await fetchAsBase64(imageUrl);
  const raw = await generate([
    { inline_data: { mime_type: mimeType, data } },
    { text: TEARDOWN_INSTRUCTION.replace('"format": "VIDEO"', '"format": "IMAGE"') },
  ]);
  return parseJson(raw);
}

function parseJson(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(cleaned);
}
