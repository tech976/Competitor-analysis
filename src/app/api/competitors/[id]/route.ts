import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const Patch = z.object({
  fbPageId: z.string().nullable().optional(),
  fbPageName: z.string().nullable().optional(),
});

/** Update a competitor — used to set its exact Facebook page. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  try {
    const competitor = await prisma.competitor.update({
      where: { id },
      data: {
        fbPageId: parsed.data.fbPageId ?? undefined,
        fbPageName: parsed.data.fbPageName ?? undefined,
      },
    });
    return NextResponse.json({ competitor });
  } catch {
    return NextResponse.json({ error: "Competitor not found." }, { status: 404 });
  }
}

/** Remove a competitor (and its ads, via cascade). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.competitor.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Competitor not found." }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
