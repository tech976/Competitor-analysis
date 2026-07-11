// Test competitor-discovery quality directly against Gemini (no DB needed).
import fs from "node:fs";
const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; })
);
const key = env.GEMINI_API_KEY;
const model = env.GEMINI_MODEL || "gemini-2.5-flash";

const brand = { name: "Plum", industry: "D2C / Skincare", audience: "Women 22-38, urban India", usp: "100% vegan, toxin-free skincare", geography: "India" };
const prompt = `You are a competitive-intelligence analyst. List the CLOSEST direct competitors of the brand below — real, well-known brands that actively run Meta (Facebook/Instagram) ads in ${brand.geography}.
BRAND: name=${brand.name}, industry=${brand.industry}, audience=${brand.audience}, USP=${brand.usp}.
Return JSON: { "competitors": [ { "name": "<exact brand>", "closeness": <1-10>, "why": "<=12 words" }, ... up to 10, most direct first ] }
Only real brands that advertise on Meta. Do not include the brand itself. JSON only.`;

const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.4 } }),
});
console.log("HTTP", res.status);
const data = await res.json();
const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
const parsed = JSON.parse(text.replace(/^```json/i, "").replace(/```$/, "").trim());
console.log(`\nClosest competitors for ${brand.name}:`);
for (const c of parsed.competitors) console.log(`  ${String(c.closeness).padStart(2)}/10  ${c.name.padEnd(24)} ${c.why}`);
