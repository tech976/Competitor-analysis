import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Top proven-winner competitor ads across all clients. */
export async function GET() {
  const ads = await prisma.ad.findMany({
    where: { isProvenWinner: true, advertiserType: "COMPETITOR" },
    orderBy: { winningScore: "desc" },
    take: 24,
    include: { analysis: true, client: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ ads });
}
