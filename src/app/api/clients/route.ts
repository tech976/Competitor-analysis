import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getOrCreateAgency } from "@/lib/agency";

export const dynamic = "force-dynamic";

/** List clients with quick counts + their latest scan. */
export async function GET() {
  const clients = await prisma.client.findMany({
    include: {
      context: true,
      _count: { select: { competitors: true, ads: true } },
      scanRuns: { orderBy: { startedAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ clients });
}

const CreateClient = z.object({
  name: z.string().min(1, "Client name is required."),
  fbPageName: z.string().optional(),
  igHandle: z.string().optional(),
  competitors: z.array(z.string().min(1)).optional(),
  context: z
    .object({
      industry: z.string().optional(),
      targetAudience: z.string().optional(),
      geography: z.string().optional(),
      usp: z.string().optional(),
      products: z.string().optional(),
      brandVoice: z.string().optional(),
      positioning: z.string().optional(),
      goals: z.string().optional(),
      doNots: z.string().optional(),
      sourceWebsite: z.string().optional(),
    })
    .optional(),
});

/** Create a client (+ optional brand context + competitors). */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = CreateClient.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }
  const { name, fbPageName, igHandle, competitors, context } = parsed.data;
  const agency = await getOrCreateAgency();

  const client = await prisma.client.create({
    data: {
      agencyId: agency.id,
      name,
      fbPageName: fbPageName || null,
      igHandle: igHandle || null,
      context: context ? { create: context } : undefined,
      competitors: competitors?.length
        ? { create: competitors.map((c) => ({ name: c })) }
        : undefined,
    },
    include: { context: true, competitors: true },
  });

  return NextResponse.json({ client }, { status: 201 });
}
