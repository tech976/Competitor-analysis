import { NextResponse } from "next/server";
import { discoverCompetitors } from "@/lib/discover";
import { llmConfigured } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Suggest the closest competitors for a client (AI, from its brand context). */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!llmConfigured()) {
    return NextResponse.json(
      { error: "No AI configured — set GEMINI_API_KEY to discover competitors." },
      { status: 503 }
    );
  }
  try {
    const competitors = await discoverCompetitors(id);
    return NextResponse.json({ competitors: competitors ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Discovery failed." },
      { status: 502 }
    );
  }
}
