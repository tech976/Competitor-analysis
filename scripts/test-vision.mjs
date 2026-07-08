// Verify Gemini vision scoring + N/A handling. node scripts/test-vision.mjs <clientId>
const base = "http://localhost:3000";
const CID = process.argv[2] || "cmqz1rm2x0001nf20tipbkyth";

const c = (await (await fetch(`${base}/api/ads?clientId=${CID}&type=CLIENT&take=5`)).json()).ads;
const r = (await (await fetch(`${base}/api/ads?clientId=${CID}&type=COMPETITOR&winnersOnly=1&take=8`)).json()).ads;
if (!c.length || r.length < 2) { console.log("need ads", c.length, r.length); process.exit(0); }

// Prefer an image ad on the client side to prove vision + N/A on script.
const clientAd = c.find((a) => a.mediaType === "IMAGE" || a.mediaType === "CAROUSEL") ?? c[0];
console.log("Client ad:", clientAd.advertiserName, clientAd.mediaType, "| hasImage:", !!clientAd.imageUrl);

const res = await fetch(`${base}/api/multi-compare`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ clientAdId: clientAd.id, competitorAdIds: [r[0].id, r[1].id] }),
});
console.log("HTTP", res.status);
const { result, error } = await res.json();
if (error) { console.log("ERROR:", error); process.exit(0); }

for (const col of result.columns) {
  console.log(`\n${col.isClient ? "YOU" : col.advertiserName}  →  ${col.overall}/100 ${col.label}`);
  for (const asp of result.aspects) {
    const s = col.scores[asp.key];
    const val = s?.na ? "N/A" : String(s?.score);
    console.log("  " + asp.label.padEnd(18), val.padStart(3), "  " + (s?.note ?? ""));
  }
}
