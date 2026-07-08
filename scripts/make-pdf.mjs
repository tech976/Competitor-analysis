import puppeteer from "puppeteer-core";
import { pathToFileURL } from "node:url";
import fs from "node:fs";

const exe = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find((p) => fs.existsSync(p));

const base = "C:/Users/abhis/OneDrive - Vidyalankar Polytechnic/Desktop/comp-analysis/adgap-iq/docs";
const doc = `${base}/AdGapIQ-Feature-Guide.html`;
const out = `${base}/AdGapIQ-Feature-Guide.pdf`;

const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.goto(pathToFileURL(doc).href, { waitUntil: "networkidle0" });
await page.pdf({ path: out, printBackground: true, preferCSSPageSize: true });
await browser.close();

const kb = Math.round(fs.statSync(out).size / 1024);
console.log(`PDF written: ${out} (${kb} KB)`);
