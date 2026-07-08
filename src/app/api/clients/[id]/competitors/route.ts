import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const AddCompetitor = z.object({
  name: z.string().min(1, "Competitor name is required."),
  fbPageName: z.string().optional(),
  igHandle: z.string().optional(),
});

/** Add a competitor to a client. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = AddCompetitor.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const client = await prisma.client.findUnique({ where: { id }, select: { id: true } });
  if (!client) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  const competitor = await prisma.competitor.create({
    data: {
      clientId: id,
      name: parsed.data.name,
      fbPageName: parsed.data.fbPageName || null,
      igHandle: parsed.data.igHandle || null,
    },
  });
  return NextResponse.json({ competitor }, { status: 201 });
}
