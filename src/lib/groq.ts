/**
 * Server-side Groq client (OpenAI-compatible Chat Completions). Fast, free-tier
 * friendly LLM used for the marketing comparison synthesis. SERVER-ONLY.
 *
 * Uses a second key automatically if the first is rate-limited or the org is
 * restricted (Groq free-tier accounts can get temporarily blocked).
 */
import { env, MissingCredentialError } from "./env";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Errors worth retrying with a different key (auth / rate / org issues). */
function isKeyIssue(status: number, body: string): boolean {
  if (status === 401 || status === 403 || status === 429) return true;
  return /restricted|invalid_api_key|organization|rate.?limit|quota/i.test(body);
}

export async function groqComplete(
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number; json?: boolean } = {}
): Promise<string> {
  const keys = [env.groqKey, env.groqKey2].filter(Boolean);
  if (keys.length === 0) {
    throw new MissingCredentialError(
      "GROQ_API_KEY is not set. Add it to your .env to enable AI comparison."
    );
  }

  let lastError = "";
  for (let i = 0; i < keys.length; i++) {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${keys[i]}`,
      },
      body: JSON.stringify({
        model: env.groqModel,
        messages,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 1500,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return data.choices?.[0]?.message?.content ?? "";
    }

    const body = await res.text().catch(() => "");
    lastError = `Groq API error ${res.status}: ${body.slice(0, 300) || res.statusText}`;

    // If it's a key/rate/org issue and we have another key, try it. Otherwise
    // it's a real request error — fail fast.
    const another = i < keys.length - 1;
    if (!isKeyIssue(res.status, body) || !another) {
      throw new Error(lastError);
    }
  }

  throw new Error(lastError || "Groq request failed.");
}
