// Prove page-scoped scraping returns ONLY that page's ads.
// node scripts/test-page-scrape.mjs <pageId>
import fs from "node:fs";
const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; })
);
const token = env.APIFY_TOKEN;
const actor = env.APIFY_META_ADS_ACTOR || "apify~facebook-ads-scraper";
const pageId = process.argv[2] || "100144616116660";

const url = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=IN&media_type=all&view_all_page_id=${pageId}&search_type=page`;
const input = { urls: [{ url }], startUrls: [{ url }], searchTerms: [], count: 30, resultsLimit: 30, "scrapePageAds.activeStatus": "active", country: "IN" };

const res = await fetch(`https://api.apify.com/v2/actors/${actor}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`,
  { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
console.log("HTTP", res.status);
const items = await res.json();
console.log("ads returned:", items.length);
const byPage = new Map();
for (const it of items) {
  const name = it.pageName ?? "?";
  byPage.set(name, (byPage.get(name) ?? 0) + 1);
}
console.log("distinct pages in result:");
for (const [name, n] of byPage) console.log(`  ${n}  ${name}`);
