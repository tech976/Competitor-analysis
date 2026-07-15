import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateAdCopy, type AdCopyOutput } from "@/lib/adcopy";
import { llmConfigured } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // deep research + generation is slow

const Body = z.object({
  clientId: z.string().min(1),
  website: z.string().trim().max(300).optional(),
  goal: z.string().trim().max(600).optional(),
});

/** Count headlines across all groups for a run summary. */
function headlineCount(output: unknown): number {
  const o = output as AdCopyOutput | null;
  if (!o?.headlineGroups) return 0;
  return o.headlineGroups.reduce((n, g) => n + (g.headlines?.length ?? 0), 0);
}

/** GET ?clientId= → run history + latest full run. GET ?runId= → one full run. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const runId = url.searchParams.get("runId");
  const clientId = url.searchParams.get("clientId");

  if (runId) {
    const run = await prisma.adCopyRun.findUnique({ where: { id: runId } });
    if (!run) return NextResponse.json({ error: "Run not found." }, { status: 404 });
    return NextResponse.json({ run });
  }

  if (!clientId) {
    return NextResponse.json({ error: "clientId or runId is required." }, { status: 400 });
  }

  const runs = await prisma.adCopyRun.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const latest = runs.find((r) => r.status === "SUCCEEDED") ?? null;
  return NextResponse.json({
    runs: runs.map((r) => ({
      id: r.id,
      status: r.status,
      goal: r.goal,
      website: r.website,
      createdAt: r.createdAt,
      finishedAt: r.finishedAt,
      headlineCount: headlineCount(r.output),
      error: r.error,
    })),
    latest,
  });
}

/** POST → run the full research + generation pipeline for a client. */
export async function POST(req: Request) {
  if (!llmConfigured()) {
    return NextResponse.json(
      { error: "No AI configured — set an AI key (Gemini or Groq) to generate ad copy." },
      { status: 503 }
    );
  }

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

  const client = await prisma.client.findUnique({ where: { id: parsed.data.clientId } });
  if (!client) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  try {
    const result = await generateAdCopy(parsed.data.clientId, {
      website: parsed.data.website,
      goal: parsed.data.goal,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ad copy generation failed." },
      { status: 502 }
    );
  }
}
