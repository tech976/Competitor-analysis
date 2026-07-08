// Live test of the 1-to-1 ad comparison. Usage: node scripts/test-duel.mjs <clientId>
const base = "http://localhost:3000";
const CID = process.argv[2] || "cmqz1rm2x0001nf20tipbkyth";

const c = (await (await fetch(`${base}/api/ads?clientId=${CID}&type=CLIENT&take=5`)).json()).ads;
const r = (await (await fetch(`${base}/api/ads?clientId=${CID}&type=COMPETITOR&winnersOnly=1&take=5`)).json()).ads;
if (!c.length || !r.length) {
  console.log("Need both a client ad and a competitor winner. have:", c.length, r.length);
  process.exit(0);
}
console.log("YOUR AD:      ", c[0].advertiserName, "|", c[0].mediaType, "|", (c[0].headline || c[0].primaryText || "").slice(0, 50));
console.log("COMPETITOR AD:", r[0].advertiserName, "|", r[0].mediaType, "|", (r[0].headline || r[0].primaryText || "").slice(0, 50));

const res = await fetch(`${base}/api/ad-compare`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ clientAdId: c[0].id, competitorAdId: r[0].id }),
});
console.log("\nHTTP", res.status);
const { result, error } = await res.json();
if (error) {
  console.log("ERROR:", error);
  process.exit(0);
}

console.log(`\nOVERALL:  You ${result.client.overall}/100   vs   Competitor ${result.competitor.overall}/100   →  ${result.overallWinner}`);
console.log("VERDICT: ", result.verdict);
console.log("\nRADAR / SCORECARD:");
for (const d of result.dims) {
  const w = result.winners[d.key];
  console.log(
    "  " + d.label.padEnd(14),
    "you", String(result.client.scores[d.key]).padStart(2),
    " rival", String(result.competitor.scores[d.key]).padStart(2),
    " " + (w === "CLIENT" ? "✓ you" : w === "COMPETITOR" ? "✗ them" : "= tie")
  );
}
console.log("\nPersuasion — you:", result.client.persuasionAngle, "| rival:", result.competitor.persuasionAngle);
console.log("Offer — you:", result.client.offerType, "| rival:", result.competitor.offerType);
console.log("\nWHY THEY WIN:");
for (const x of result.whyCompetitorWins) console.log("  •", x);
console.log("\nWHERE YOU'RE LOSING:");
for (const x of result.whereClientLosing) console.log("  ✗", x);
console.log("\nIMMEDIATE FIXES:");
result.immediateFixes.forEach((x, i) => console.log(`  ${i + 1}.`, x));
