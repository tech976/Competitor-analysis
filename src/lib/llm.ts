/**
 * LLM router for text synthesis. Tries providers in order and falls through on
 * failure, so a restricted/rate-limited Groq key doesn't break the feature:
 *   Groq (primary) → Gemini (fallback) → Claude (fallback).
 */
import { integrations } from "./env";
import { ADGAP_SYSTEM, completeJson as anthropicCompleteJson } from "./anthropic";
import { groqComplete } from "./groq";
import { geminiText } from "./gemini";

export function llmConfigured(): boolean {
  return integrations.llm;
}

export function llmProvider(): "groq" | "gemini" | "anthropic" | null {
  if (integrations.groq) return "groq";
  if (integrations.gemini) return "gemini";
  if (integrations.anthropic) return "anthropic";
  return null;
}

function stripFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
}

/**
 * Parse model JSON tolerantly. LLMs (especially at higher temperature) sometimes
 * wrap the JSON in prose or add a trailing note, which trips strict JSON.parse.
 * Fall back to extracting the outermost {...} / [...] block before giving up.
 */
export function parseLenientJson<T = unknown>(raw: string): T {
  const cleaned = stripFences(raw);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const firstObj = cleaned.indexOf("{");
    const firstArr = cleaned.indexOf("[");
    let start: number;
    let close: string;
    if (firstArr !== -1 && (firstObj === -1 || firstArr < firstObj)) {
      start = firstArr;
      close = "]";
    } else {
      start = firstObj;
      close = "}";
    }
    const end = cleaned.lastIndexOf(close);
    if (start === -1 || end === -1 || end < start) {
      throw new Error("Model did not return valid JSON.");
    }
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  }
}

/**
 * Ask the configured LLM for JSON and parse it. Tries each configured provider
 * in turn; returns the first success, throws the last error if all fail.
 */
export async function completeJson<T = unknown>(
  prompt: string,
  opts: { system?: string; maxTokens?: number; temperature?: number } = {}
): Promise<T> {
  const system =
    (opts.system ?? ADGAP_SYSTEM) +
    "\n\nRespond with VALID JSON only — no prose, no markdown fences.";

  const attempts: Array<() => Promise<T>> = [];

  if (integrations.groq) {
    attempts.push(async () => {
      const raw = await groqComplete(
        [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        { maxTokens: opts.maxTokens, json: true, temperature: opts.temperature }
      );
      return parseLenientJson<T>(raw);
    });
  }
  if (integrations.gemini) {
    attempts.push(async () => {
      const raw = await geminiText(`${system}\n\n${prompt}`, opts.temperature);
      return parseLenientJson<T>(raw);
    });
  }
  if (integrations.anthropic) {
    attempts.push(() =>
      anthropicCompleteJson<T>([{ role: "user", content: prompt }], {
        system: opts.system,
        maxTokens: opts.maxTokens,
        temperature: opts.temperature,
      })
    );
  }

  let lastError: unknown = new Error("No LLM configured.");
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}
