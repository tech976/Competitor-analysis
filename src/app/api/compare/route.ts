import { NextResponse } from "next/server";
import { z } from "zod";
import { buildComparison } from "@/lib/compare";

// Rebuild the AI comparison for an existing scan WITHOUT re-scraping ads.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const Body = z.object({ scanRunId: z.string().min(1) });

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "scanRunId is required." }, { status: 400 });
  }

  try {
    const comparisonId = await buildComparison(parsed.data.scanRunId);
    return NextResponse.json({ comparisonId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Comparison failed." },
      { status: 502 }
    );
  }
}
