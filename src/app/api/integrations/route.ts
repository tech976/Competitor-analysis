import { NextResponse } from "next/server";
import { integrations } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Which integrations are configured (no secrets) — used to gate the UI. */
export async function GET() {
  return NextResponse.json({
    apify: integrations.apify,
    groq: integrations.groq,
    gemini: integrations.gemini,
    llm: integrations.llm,
  });
}
