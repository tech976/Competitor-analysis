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

/** Low-level: send parts to Gemini generateContent and return the text. */
async function generate(
  parts: Array<Record<string, unknown>>
): Promise<string> {
  const key = requireGeminiKey();
  const url = `${GEMINI_BASE}/models/${env.geminiModel}:generateContent?key=${encodeURIComponent(
    key
  )}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Gemini API error ${res.status}: ${body.slice(0, 400) || res.statusText}`
    );
  }

  const data = (await res.json()) as GeminiResponse;
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
}

/** Text-only generation (JSON) — used as an LLM fallback when Groq is down. */
export async function geminiText(prompt: string): Promise<string> {
  return generate([{ text: prompt }]);
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

/**
 * Download a VIDEO into a Gemini inline video part so the model watches the
 * whole ad (frames + audio). Returns null if it fails or is too large for an
 * inline request (~20MB cap) — the caller then falls back to the thumbnail.
 */
export async function fetchVideoPart(
  url: string,
  maxBytes = 14_000_000
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const len = Number(res.headers.get("content-length") || 0);
    if (len && len > maxBytes) return null; // skip download if we know it's too big
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > maxBytes) return null;
    const mimeType = res.headers.get("content-type") || "video/mp4";
    return {
      inline_data: {
        mime_type: mimeType.startsWith("video/") ? mimeType : "video/mp4",
        data: buf.toString("base64"),
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
