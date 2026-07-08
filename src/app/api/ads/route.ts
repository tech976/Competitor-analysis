import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * List ads for a client.
 * Query: ?clientId= (required) &type=CLIENT|COMPETITOR &winnersOnly=1
 *        &competitorId= &take=
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId is required." }, { status: 400 });
  }

  const where: Prisma.AdWhereInput = { clientId };
  const type = searchParams.get("type");
  if (type === "CLIENT" || type === "COMPETITOR") where.advertiserType = type;
  if (searchParams.get("winnersOnly") === "1") where.isProvenWinner = true;
  const competitorId = searchParams.get("competitorId");
  if (competitorId) where.competitorId = competitorId;

  const take = Math.min(200, Number(searchParams.get("take") ?? "100") || 100);

  const ads = await prisma.ad.findMany({
    where,
    include: { analysis: true },
    orderBy: [{ isProvenWinner: "desc" }, { winningScore: "desc" }],
    take,
  });
  return NextResponse.json({ ads });
}
