import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Full scan history across all clients, newest first. */
export async function GET() {
  const scans = await prisma.scanRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 100,
    include: {
      client: { select: { id: true, name: true, _count: { select: { competitors: true } } } },
      comparison: { select: { gapScore: true } },
    },
  });

  return NextResponse.json({
    scans: scans.map((s) => ({
      id: s.id,
      clientId: s.clientId,
      clientName: s.client.name,
      competitors: s.client._count.competitors,
      adsFetched: s.adsFetched,
      gapScore: s.comparison?.gapScore ?? null,
      status: s.status,
      scrapeCost: s.scrapeCost,
      startedAt: s.startedAt,
    })),
  });
}
