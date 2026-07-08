// Copy all data from local PG16 (5433) → Neon, via Prisma (which reaches Neon
// fine, unlike psql). Clears Neon tables first, then copies in FK-safe order.
import pkg from "@prisma/client";
const { PrismaClient } = pkg;

const SRC = "postgresql://postgres:postgres@localhost:5433/adgapiq?schema=public";
const DST = "postgresql://neondb_owner:npg_xCmUnb4iBYG3@ep-muddy-pond-aoseg8tw.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

const src = new PrismaClient({ datasources: { db: { url: SRC } } });
const dst = new PrismaClient({ datasources: { db: { url: DST } } });

// Parents before children.
const forward = [
  "agency", "client", "clientContext", "clientKnowledge", "competitor",
  "scanRun", "ad", "adObservation", "adAnalysis", "comparison",
  "comparisonDimension", "competitorAssessment", "feedback", "winningPattern",
];

console.log("Clearing Neon tables…");
for (const m of [...forward].reverse()) {
  try { await dst[m].deleteMany({}); } catch (e) { console.log("  clear", m, "→", e.message.split("\n")[0]); }
}

console.log("Copying local → Neon…");
let total = 0;
for (const m of forward) {
  const rows = await src[m].findMany();
  if (!rows.length) { console.log(`  ${m.padEnd(20)} 0`); continue; }
  const res = await dst[m].createMany({ data: rows, skipDuplicates: true });
  total += res.count;
  console.log(`  ${m.padEnd(20)} ${res.count}/${rows.length}`);
}
console.log(`\nDONE — ${total} rows copied to Neon.`);

await src.$disconnect();
await dst.$disconnect();
