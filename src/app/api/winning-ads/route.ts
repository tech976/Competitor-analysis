import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { metaAdUrl } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Top proven-winner competitor ads across all clients. */
export async function GET() {
  const ads = await prisma.ad.findMany({
    where: { isProvenWinner: true, advertiserType: "COMPETITOR" },
    orderBy: { winningScore: "desc" },
    take: 24,
    include: { analysis: true, client: { select: { id: true, name: true } } },
  });
  // Rebuild the deep-link from the archive id so invalid ids become null (the
  // UI then hides the link instead of opening Meta's "ad isn't in library").
  return NextResponse.json({
    ads: ads.map((a) => ({ ...a, adLibraryUrl: metaAdUrl(a.adArchiveId) })),
  });
}
