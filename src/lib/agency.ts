/**
 * Single-agency helper. Auth is deferred (one agency for now, like the
 * reference project); everything hangs off one Agency row created on demand.
 */
import { prisma } from "./db";

export async function getOrCreateAgency() {
  const existing = await prisma.agency.findFirst();
  if (existing) return existing;
  return prisma.agency.create({ data: { name: "Digiveritaz" } });
}
