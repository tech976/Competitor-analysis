# Deploying AdGapIQ — Vercel + Neon

Go-live checklist. Do the steps in order. You only need three accounts: **GitHub**, **Neon** (database), **Vercel** (hosting).

---

## 1 · Push the code to GitHub

1. Create a **new empty PRIVATE repo** at github.com (name it e.g. `adgap-iq`). Do **not** add a README/.gitignore there.
2. In this folder (`adgap-iq/`), run — replacing `<you>`:

```bash
git remote add origin https://github.com/<you>/adgap-iq.git
git push -u origin main
```

> Your `.env` (with the API keys) is git-ignored, so secrets are **not** uploaded. Good.

---

## 2 · Create the database (Neon — free)

1. Go to **neon.tech** → sign up → **New Project** (region closest to you).
2. Open the project → **Connection Details** → copy the **connection string**
   (it looks like `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`).
   Use the **pooled** connection string if offered.

---

## 3 · Create the tables in Neon

Run this **once** from your PC, with the Neon URL (PowerShell):

```powershell
$env:DATABASE_URL="<paste-neon-connection-string>"; npm run db:push
```

This creates all the tables in the cloud database. (It starts empty — you'll re-add clients in the app. Existing local data can be migrated later if needed.)

---

## 4 · Deploy on Vercel

1. Go to **vercel.com** → **Add New… → Project** → **Import** your GitHub repo.
2. Framework preset: **Next.js** (auto-detected). Leave build settings default —
   our build already runs `prisma generate && next build`.
3. Add **Environment Variables** (Production), then Deploy:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | your Neon connection string |
| `APIFY_TOKEN` | your Apify token |
| `APIFY_META_ADS_ACTOR` | `apify~facebook-ads-scraper` |
| `GEMINI_API_KEY` | your Gemini API key |
| `GEMINI_MODEL` | `gemini-2.5-flash` |
| `GROQ_API_KEY` | your Groq key *(optional; currently restricted → app auto-uses Gemini)* |

*(The pricing/tuning vars have sensible defaults; add them only to override.)*

---

## 5 · Enable long scans — IMPORTANT

A full scan runs up to ~5 minutes. **Vercel's free (Hobby) plan cuts functions off at 60 seconds**, so scans will time out.

➡ **Upgrade to Vercel Pro ($20/mo)** so the scan route's 5-minute limit works. (Everything else — dashboard, comparisons — works on free; only the scan needs the longer limit.)

*Later optimisation: move scans to a background job so they aren't bound by any request timeout.*

---

## 6 · Go live

Open your Vercel URL (e.g. `adgap-iq.vercel.app`) → add a client → set its Facebook page → **Run scan**. 🎉

---

## Notes

- **No login.** The URL is public — keep it private, or add a password gate before sharing widely.
- **pgvector (learning loop)** is currently off. Neon supports it, so when ready: uncomment the `embedding` lines + `extensions = [vector]` in `prisma/schema.prisma`, then `npm run db:push` again.
- **Costs:** Neon free · Vercel Pro $20/mo · Apify + AI ≈ your usage (~$5–10/mo). Total ≈ $25–30/mo.
- **Auto-deploy:** every `git push` to `main` redeploys automatically.
