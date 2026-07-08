/**
 * Server-side Claude client — drives the marketing-angle comparison synthesis,
 * competitor ratings, and sales-growth recommendations. Extended beyond the
 * reference project's text-only `complete()` to support multimodal blocks
 * (image teardowns) and JSON-mode prompting.
 *
 * SERVER-ONLY: the API key must never reach the browser. Import this from
 * /api/* routes only.
 */
import { env, requireAnthropicKey } from "./env";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

/**
 * House system prompt — a senior performance-marketing strategist. Everything
 * is framed in MARKETING terms: hooks, offers, angles, CTRs, sales growth.
 */
export const ADGAP_SYSTEM = `You are AdGapIQ — a senior performance-marketing strategist at an Indian digital marketing agency (Digiveritaz). You analyse competitors' Meta ads and compare them against a client's ads to find exactly where the client is losing and how to win.

Always think and write in MARKETING terms: hooks, scroll-stoppers, offers, angles, social proof, CTAs, creative formats, and ultimately SALES GROWTH. Be specific and actionable — every gap must come with a concrete fix a creative team can execute this week. Be concise and structured. India-aware (₹, local context). Never invent data you weren't given.`;

/** A content block: text or an image (by URL or base64). */
export type Block =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "url"; url: string } }
  | {
      type: "image";
      source: { type: "base64"; media_type: string; data: string };
    };

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string | Block[];
}

export interface CompleteOptions {
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

/** Send a (optionally multimodal) message to Claude; returns the text reply. */
export async function complete(
  messages: ClaudeMessage[],
  opts: CompleteOptions = {}
): Promise<string> {
  const apiKey = requireAnthropicKey();

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: env.anthropicModel,
      max_tokens: opts.maxTokens ?? 1500,
      temperature: opts.temperature ?? 0.4,
      system: opts.system ?? ADGAP_SYSTEM,
      messages,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Anthropic API error ${res.status}: ${body.slice(0, 400) || res.statusText}`
    );
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  return data.content?.find((b) => b.type === "text")?.text ?? "";
}

/**
 * Convenience: ask Claude for JSON and parse it. We instruct JSON-only and
 * strip any accidental markdown fences before parsing.
 */
export async function completeJson<T = unknown>(
  messages: ClaudeMessage[],
  opts: CompleteOptions = {}
): Promise<T> {
  const raw = await complete(messages, {
    ...opts,
    system:
      (opts.system ?? ADGAP_SYSTEM) +
      "\n\nRespond with VALID JSON only — no prose, no markdown fences.",
  });
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(cleaned) as T;
}
