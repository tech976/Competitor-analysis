// Pretty-print the latest comparison for a client. Usage: node scripts/show-comparison.mjs <clientId>
const id = process.argv[2];
const r = await fetch(`http://localhost:3000/api/clients/${id}`);
const { client } = await r.json();
const c = client?.scanRuns?.[0]?.comparison;
if (!c) {
  console.log("No comparison found.");
  process.exit(0);
}
const line = "─".repeat(70);
console.log(`\n${line}\nCLIENT: ${client.name}   |   GAP/OPPORTUNITY SCORE: ${c.gapScore}/100\n${line}`);
console.log(`\nTL;DR:\n  ${c.tldr}`);
console.log(`\nOVERALL SUMMARY:\n  ${c.overallSummary}`);
console.log(`\nWHERE YOU'RE LACKING:\n${c.lackingSummary}`);
console.log(`\nTO GROW SALES:\n${c.salesGrowthPlan}`);
console.log(`\nNEXT-CAMPAIGN IDEAS:\n${c.suggestions}`);

console.log(`\n${line}\nCOMPETITOR RATINGS (1-10)\n${line}`);
for (const a of c.competitors ?? []) {
  console.log(`\n  ${a.competitor.name} — ${a.rating}/10   (winners: ${a.winnerCount})`);
  if (a.summary) console.log(`    ${a.summary}`);
  if (a.topStrength) console.log(`    Learn from them: ${a.topStrength}`);
}

console.log(`\n${line}\nASPECT-BY-ASPECT (${(c.dimensions ?? []).length} dimensions)\n${line}`);
for (const d of c.dimensions ?? []) {
  console.log(`\n  ${d.dimension}  [${d.mark}]  you ${d.clientScore}/10  vs  rival ${d.competitorBestScore}/10`);
  if (d.reasoning) console.log(`    ${d.reasoning}`);
  if (d.fix) console.log(`    Fix: ${d.fix}`);
}
console.log("");
