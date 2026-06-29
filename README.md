# MasterAnalytics Pro

> Polio Campaign Data Analytics Dashboard
> Developed by **M. Nadeem Akhtar** — [Facebook](https://www.facebook.com/itxmasterjee)

A full-stack analytics platform for polio immunization campaigns. Upload daily &
catch-up Excel reports, visualize coverage across UCs, and get AI-powered insights
to identify underperforming areas.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS 3 + shadcn/ui primitives |
| Database & Auth | Supabase (PostgreSQL + RLS) |
| Charts | Recharts |
| AI Insights | Groq SDK (LLaMA-3.3-70B) |
| Excel parsing | SheetJS (`xlsx`) |
| Notifications | Sonner |

---

## Getting the project files to your PC

You have **three options** — pick whichever fits your workflow.

### Option A — Download the ZIP (fastest, one-time)

1. The file `download/masteranalytics-pro.zip` (75 KB) is ready in this workspace.
2. Download it to your PC.
3. Unzip it anywhere:
   ```bash
   unzip masteranalytics-pro.zip -d masteranalytics-pro
   cd masteranalytics-pro
   ```
4. Install dependencies and run:
   ```bash
   bun install        # or: npm install
   cp .env.example .env.local
   # edit .env.local with your Supabase + Groq keys
   bun run dev        # or: npm run dev
   ```
   Open http://localhost:3000

### Option B — Clone via GitHub (recommended for ongoing dev)

This workspace already has a git repo initialized. To push it to your own GitHub:

1. Create an empty repo on GitHub: https://github.com/new
   - Name: `masteranalytics-pro`
   - **Do not** add README/.gitignore (we already have them)
2. In this workspace, run (replacing `YOUR_USERNAME`):
   ```bash
   cd /home/z/my-project
   git remote add origin https://github.com/YOUR_USERNAME/masteranalytics-pro.git
   git push -u origin main
   ```
3. On your PC:
   ```bash
   git clone https://github.com/YOUR_USERNAME/masteranalytics-pro.git
   cd masteranalytics-pro
   bun install        # or npm install
   cp .env.example .env.local
   # fill in your keys
   bun run dev
   ```
4. Future updates: `git pull` on your PC after each step I build here.

### Option C — Copy individual files

Anything in `download/` is directly downloadable. Currently:
- `download/schema.sql` — the Supabase SQL schema
- `download/masteranalytics-pro.zip` — full project ZIP
- `download/README.md` — this file

---

## Deploy to Vercel

### Prerequisites
1. A Supabase project with `schema.sql` executed (Step 2).
2. A Groq API key from https://console.groq.com/keys.
3. The project pushed to GitHub (Option B above) OR a ZIP ready (Option A).

### Deploy steps
1. Go to https://vercel.com → **Add New Project**.
2. Import your GitHub repo (or drag the ZIP if using Option A).
3. Vercel auto-detects Next.js — keep defaults.
4. **Add Environment Variables** (Settings → Environment Variables):

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR-PROJECT-ref.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service role key |
   | `GROQ_API_KEY` | your Groq key |
   | `GROQ_MODEL` | `llama-3.3-70b-versatile` |

5. Click **Deploy**. First build takes ~2 minutes.
6. After deploy, copy your Vercel URL (e.g. `https://masteranalytics-pro.vercel.app`).

### Supabase URL allow-list (REQUIRED for auth to work)
In Supabase Dashboard → **Authentication → URL Configuration**:
- **Site URL**: `https://masteranalytics-pro.vercel.app`
- **Redirect URLs**: add `https://masteranalytics-pro.vercel.app/auth/callback`

---

## Local development

```bash
# Install deps
bun install

# Run dev server (port 3000)
bun run dev

# Lint
bun run lint

# Type-check
bunx tsc --noEmit

# Production build (DO NOT use this in dev — the workspace runs `bun run dev` automatically)
bun run build && bun run start
```

---

## Build Progress (8-step plan — ALL COMPLETE)

- [x] **Step 1** — Dependencies & `.env.local` template
- [x] **Step 2** — SQL schema + RLS policies (`supabase/schema.sql`)
- [x] **Step 3** — Supabase client utilities (browser + server + middleware)
- [x] **Step 4** — Authentication UI (login/signup) + auth callback
- [x] **Step 5** — File upload UI + `/api/upload` route (`*` cleaning logic)
- [x] **Step 6** — Dashboard UI (filters, KPI cards, Recharts)
- [x] **Step 7** — Groq AI insight API + UI component
- [x] **Step 8** — PDF Report export (`@react-pdf/renderer`, A4, bookmarks, headers/footers, 7 sections)

> **Note on PDF library**: The original spec asked for `reportlab` (Python), but Vercel is Node.js-only. The PDF generator was rewritten in pure TypeScript using `@react-pdf/renderer` — fully Vercel-compatible, no Python required. All other spec requirements (A4, margins, headers/footers, bookmarks, 7 sections, ≤10MB) are met.

---

## Project Structure

```
masteranalytics-pro/
├── supabase/
│   └── schema.sql            # Run this in Supabase SQL Editor
├── src/
│   ├── app/
│   │   ├── layout.tsx        # Root layout + footer credits
│   │   ├── page.tsx          # Landing / progress page
│   │   ├── globals.css       # Tailwind + shadcn CSS vars
│   │   ├── login/            # Sign-in page
│   │   ├── signup/           # Registration page
│   │   ├── auth/callback/    # PKCE email-confirmation handler
│   │   ├── dashboard/        # Main analytics dashboard
│   │   ├── upload/           # Excel upload page (drag-drop)
│   │   └── api/
│   │       ├── upload/             # Excel parser + Supabase upsert
│   │       ├── dashboard-data/     # Filtered KPI + chart data
│   │       ├── campaign-comparison/# Current vs previous campaign
│   │       ├── ai-insights/        # Groq LLaMA-3 analysis
│   │       └── generate-report/    # PDF report generation
│   ├── components/
│   │   ├── ui/               # shadcn primitives (button, card, input, ...)
│   │   ├── dashboard/        # KPI cards, charts, filters, AI insights
│   │   └── user-menu.tsx     # Avatar dropdown
│   ├── lib/
│   │   ├── utils.ts          # cn() + data-cleaning helpers
│   │   ├── supabase/         # Browser + server + middleware clients
│   │   ├── excel/            # Parser + column maps + normalizer
│   │   ├── groq/             # Groq AI client + prompt builder
│   │   ├── pdf/              # PDF report document + SVG charts
│   │   └── dashboard/        # Aggregation logic
│   ├── hooks/
│   └── types/                # TypeScript database types
├── .env.example              # Template — copy to .env.local
├── .env.local                # YOUR secrets (gitignored)
├── .vercelignore             # Excludes dead files from Vercel deploys
├── vercel.json               # Function maxDuration settings
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
└── components.json           # shadcn config
```

---

## Credits

**Developed by M. Nadeem Akhtar**
Facebook: https://www.facebook.com/itxmasterjee

---

## License

Private project. All rights reserved.
