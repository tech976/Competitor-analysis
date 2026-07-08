import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Client detail: context, competitors, latest scan + comparison. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      context: true,
      competitors: true,
      scanRuns: {
        orderBy: { startedAt: "desc" },
        take: 1,
        include: {
          comparison: {
            include: {
              dimensions: true,
              competitors: { include: { competitor: true } },
            },
          },
        },
      },
    },
  });
  if (!client) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }
  return NextResponse.json({ client });
}

/** Offboard a client — cascade-deletes ALL of its data (context, memory,
 *  competitors, ads, scans, comparisons). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.client.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }
  // NOTE: a production build would also delete this client's media from object
  // storage here (the DB cascade only covers rows).
  return NextResponse.json({ deleted: true });
}

const Patch = z.object({
  fbPageId: z.string().nullable().optional(),
  fbPageName: z.string().nullable().optional(),
});

/** Update a client — currently used to set its exact Facebook page. */
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
    const client = await prisma.client.update({
      where: { id },
      data: {
        fbPageId: parsed.data.fbPageId ?? undefined,
        fbPageName: parsed.data.fbPageName ?? undefined,
      },
    });
    return NextResponse.json({ client });
  } catch {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }
}
