// Live test: overview KPIs + multi-column comparison. node scripts/test-multi.mjs <clientId>
const base = "http://localhost:3000";
const CID = process.argv[2] || "cmqz1rm2x0001nf20tipbkyth";

const ov = await (await fetch(`${base}/api/overview`)).json();
console.log("OVERVIEW KPIs:", JSON.stringify(ov.kpis));
console.log("recentScans:", ov.recentScans.length, "| topCompetitors:", ov.topCompetitors.map((c) => `${c.name} ${c.rating}/10`).join(", "));

const c = (await (await fetch(`${base}/api/ads?clientId=${CID}&type=CLIENT&take=5`)).json()).ads;
const r = (await (await fetch(`${base}/api/ads?clientId=${CID}&type=COMPETITOR&winnersOnly=1&take=8`)).json()).ads;
if (!c.length || r.length < 2) {
  console.log("need 1 client + 2 competitor ads. have", c.length, r.length);
  process.exit(0);
}
const body = { clientAdId: c[0].id, competitorAdIds: [r[0].id, r[1].id] };
console.log("\nComparing:", c[0].advertiserName, "vs", r[0].advertiserName, "&", r[1].advertiserName);

const res = await fetch(`${base}/api/multi-compare`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});
console.log("HTTP", res.status);
const { result, error } = await res.json();
if (error) { console.log("ERROR:", error); process.exit(0); }

const head = result.columns.map((col) => (col.isClient ? "YOU" : col.advertiserName).slice(0, 12).padStart(12)).join("");
console.log("\n" + "ASPECT".padEnd(18) + head);
for (const asp of result.aspects) {
  const row = result.columns.map((col) => String(col.scores[asp.key]?.score ?? "-").padStart(12)).join("");
  console.log(asp.label.padEnd(18) + row);
}
console.log("\n" + "OVERALL /100".padEnd(18) + result.columns.map((col) => `${col.overall} ${col.label}`.padStart(12)).join(""));
