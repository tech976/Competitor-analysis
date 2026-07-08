import { NextResponse } from "next/server";
import { z } from "zod";
import { runScan } from "@/lib/scan";
import { buildComparison } from "@/lib/compare";
import { MissingCredentialError } from "@/lib/env";

// Scans hit Apify (sync runs) + AI; keep on the Node runtime and allow time.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const Body = z.object({ clientId: z.string().min(1) });

/**
 * Run a full scan for a client: scrape ads → score winners → (if AI configured)
 * build the marketing comparison. Returns the scan summary + comparison id.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "clientId is required." }, { status: 400 });
  }

  try {
    const summary = await runScan(parsed.data.clientId);

    // Best-effort AI comparison; a missing/failed AI step shouldn't fail the
    // scan — the scraped ads + winner flags are still useful on their own.
    let comparisonId: string | null = null;
    let aiError: string | null = null;
    try {
      comparisonId = await buildComparison(summary.scanRunId);
    } catch (err) {
      aiError = err instanceof Error ? err.message : "AI comparison failed.";
    }

    return NextResponse.json({ ...summary, comparisonId, aiError });
  } catch (err) {
    if (err instanceof MissingCredentialError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scan failed." },
      { status: 502 }
    );
  }
}
