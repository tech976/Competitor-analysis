// One-off probe: inspect the Apify Ad Library actor's `snapshot` (creative)
// shape so we can lock the field mapping in src/lib/apify.ts.
// Usage: node scripts/probe-apify.mjs "Mamaearth"
import fs from "node:fs";

const env = Object.fromEntries(
  fs
    .readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    })
);

const token = env.APIFY_TOKEN;
const actor = env.APIFY_META_ADS_ACTOR || "apify~facebook-ads-scraper";
const q = process.argv[2] || "Mamaearth";
const url = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=IN&q=${encodeURIComponent(
  q
)}&search_type=keyword_unordered&media_type=all`;

const input = {
  urls: [{ url }],
  startUrls: [{ url }],
  searchTerms: [q],
  count: 4,
  resultsLimit: 4,
  "scrapePageAds.activeStatus": "active",
  country: "IN",
};

const endpoint = `https://api.apify.com/v2/actors/${actor}/run-sync-get-dataset-items?token=${encodeURIComponent(
  token
)}`;

const res = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(input),
});
console.log("HTTP", res.status);
const data = await res.json();
console.log("items:", data.length, "\n");

for (const it of data.slice(0, 3)) {
  const s = it.snapshot ?? {};
  console.log("──────────────────────────────────────────────");
  console.log("adArchiveID:", it.adArchiveID, "| isActive:", it.isActive);
  console.log("pageName:", it.pageName, "| collationCount:", it.collationCount);
  console.log("startDateFormatted:", it.startDateFormatted, "| totalActiveTime:", it.totalActiveTime);
  console.log("SNAPSHOT KEYS:", Object.keys(s));
  console.log("  body:", JSON.stringify(s.body)?.slice(0, 160));
  console.log("  title:", s.title, "| caption:", s.caption, "| link_description:", s.link_description);
  console.log("  cta_text:", s.cta_text, "| cta_type:", s.cta_type, "| link_url:", s.link_url);
  console.log("  display_format:", s.display_format);
  console.log("  images[0] keys:", s.images?.[0] ? Object.keys(s.images[0]) : null);
  console.log("  videos[0] keys:", s.videos?.[0] ? Object.keys(s.videos[0]) : null);
  console.log("  cards len:", s.cards?.length, "| cards[0] keys:", s.cards?.[0] ? Object.keys(s.cards[0]) : null);
}
