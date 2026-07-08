import puppeteer from "puppeteer-core";
import { pathToFileURL } from "node:url";
import fs from "node:fs";

const exe = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find((p) => fs.existsSync(p));
const base = "C:/Users/abhis/OneDrive - Vidyalankar Polytechnic/Desktop/comp-analysis/adgap-iq/docs";
const doc = `${base}/AdGapIQ-Feature-Guide.html`;

const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 820, height: 1160, deviceScaleFactor: 1.4 });
await page.goto(pathToFileURL(doc).href, { waitUntil: "networkidle0" });
const h = await page.evaluate(() => document.body.scrollHeight);
await page.screenshot({ path: `${base}/preview-full.png`, fullPage: true });
console.log("full render height:", h, "px  (~", (h / 1123).toFixed(1), "A4 pages at this width)");
await browser.close();
