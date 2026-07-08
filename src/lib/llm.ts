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
 * Ask the configured LLM for JSON and parse it. Tries each configured provider
 * in turn; returns the first success, throws the last error if all fail.
 */
export async function completeJson<T = unknown>(
  prompt: string,
  opts: { system?: string; maxTokens?: number } = {}
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
        { maxTokens: opts.maxTokens, json: true }
      );
      return JSON.parse(stripFences(raw)) as T;
    });
  }
  if (integrations.gemini) {
    attempts.push(async () => {
      const raw = await geminiText(`${system}\n\n${prompt}`);
      return JSON.parse(stripFences(raw)) as T;
    });
  }
  if (integrations.anthropic) {
    attempts.push(() =>
      anthropicCompleteJson<T>([{ role: "user", content: prompt }], {
        system: opts.system,
        maxTokens: opts.maxTokens,
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
