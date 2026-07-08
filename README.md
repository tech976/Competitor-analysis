# 🎯 AdGapIQ

> *"Know them. Beat them."*
> Competitor ad-gap analysis for digital marketing agencies — by Digiveritaz.

AdGapIQ scrapes a competitor's **Meta Ad Library**, finds their **winning ads** (the long-running, scaled creatives that are actually working), uses AI to **watch and break down each one**, and produces a **marketing-angle comparison** against your client's ads: where you're losing, a 1–10 rating per competitor, and exactly **what to improve to grow sales**.

Built on the same stack as our ReputeIQ app: **Next.js (App Router) + TypeScript + Prisma + Apify + Claude + Gemini**.

---

## How it works

```
Add client + competitors → Run scan
   → scrape Meta Ad Library (Apify)         [src/lib/apify.ts]
   → score every ad, flag "proven winners"  [src/lib/winning-score.ts]
   → AI watches winners (Gemini video)      [src/lib/gemini.ts]
   → marketing comparison (Claude)          [src/lib/compare.ts]
→ Dashboard: gap score · competitor ratings · aspect-by-aspect · sales-growth plan
```

The **Winning Ad Score** combines longevity + still-active + creative scaling +
engagement, with a bonus for ads that survive across multiple scans — so we only
spend AI budget deep-analyzing ads that are actually performing.

## Quick start

```bash
# 1. Install deps
npm install

# 2. Env — copy and fill in keys (app boots without them; features gate per key)
cp .env.example .env

# 3. Database (PostgreSQL + pgvector). Point DATABASE_URL at a local Postgres
#    or a free Neon/Supabase instance, then:
npm run db:push

# 4. Run
npm run dev          # http://localhost:3000
```

### Keys (all optional to boot; needed to actually scan)

| Var | Powers | Where |
| --- | ------ | ----- |
| `DATABASE_URL` | everything | local Postgres / Neon / Supabase (needs `vector` ext) |
| `APIFY_TOKEN` | Meta Ad Library scraping | console.apify.com/account/integrations |
| `APIFY_META_ADS_ACTOR` | which actor | defaults `apify~facebook-ads-scraper` |
| `ANTHROPIC_API_KEY` | comparison + recommendations | console.anthropic.com |
| `GEMINI_API_KEY` | video ad analysis | aistudio.google.com/apikey |

## Project layout

```
src/
  app/
    api/                 clients · competitors · scan · ads · image proxy · integrations
    clients/[id]/        client detail (comparison + galleries)
    page.tsx             dashboard (clients grid)
  components/
    ui/                  ReactBits-style: ScoreGauge, SpotlightCard, CountUp,
                         GradientText, Mark, Markdown, AuroraBackground, motion
    ClientCard · NewClientForm · RunScanButton · AddCompetitorForm
    ComparisonView · CompetitorRatingCard · AdCard · Sidebar · IntegrationStatus
  lib/
    apify.ts             Meta Ad Library scraper → NormalizedAd
    winning-score.ts     Winning Ad Score + proven-winner selection
    gemini.ts            video/image teardown (Gemini)
    anthropic.ts         Claude client (multimodal + JSON)
    scan.ts              orchestration: scrape → score → flag winners
    compare.ts           Claude synthesis: ratings + gaps + sales-growth plan
    db · env · types · pricing · cn · client · api-types · agency
prisma/schema.prisma     full data model (cascade-delete on client offboard)
```

## Status (Phase 1 scaffold)

- ✅ Schema, client/competitor CRUD, Meta Ad Library scraping, Winning Ad Score, append-only snapshots
- ✅ Marketing comparison (ratings, gaps, sales-growth plan) via Claude
- ✅ Elegant animated dashboard + comparison UI
- 🟡 Gemini per-video teardown wired (`src/lib/gemini.ts`) — to be invoked per winner inside the scan, with ffmpeg keyframes/transcription as the richer path
- ⬜ Client-context AI auto-draft, learning loop (pgvector), white-label PDF, new-ad alerts, scheduling, object-storage media, auth

## Notes

- The actor's exact field names vary — `src/lib/apify.ts` probes common keys defensively. **Confirm your chosen actor's schema** and tighten the mapping.
- `/api/scan` runs synchronously (fine for dev). Move to a job queue for production (a full scan can take minutes across advertisers).
- Reference architecture (read-only): `../ORM-main` (Insta Listener / ReputeIQ).
