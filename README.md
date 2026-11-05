# Pacer

*Soft hands. Hard data.*

Pacer is a single-athlete training PWA: Aakash's plan from a 5K base (Nov 5, 2026) to the Indianapolis Monumental Marathon (Nov 6, 2027), with Glacier and Mill Race on the way, a three-day lifting program, and the sleep and eating habits that hold it together. Claude is the coach, through Sunday check-ins in claude.ai. Pacer is the thing he opens every morning.

Everything the app shows as training content comes from two data files. The app renders and tracks the plan; it does not design it.

| File | What it is |
|---|---|
| `PACER_SPEC.md` | The build spec this app implements. |
| `plan.json` | Every day from Nov 5, 2026 to Nov 6, 2027: 367 days, 53 weeks, 396 sessions, notes, habits, pinned lines. |
| `content.json` | Everything undated: lift programs, pace engine, nutrition, sleep, the 7 rules, Sunday check-in, gear, swimming, races, habits, easter eggs, badges, app copy. |

When Claude adjusts the plan at a Sunday check-in, drop the new `plan.json` into the repo root, rebuild, redeploy. Never hand-edit training content inside the app code.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. The app is mobile-first; use the browser's phone viewport for a realistic look.

```bash
npm test          # vitest: data integrity, pace engine, streaks, lifts, badges, eggs, export
npm run typecheck # tsc
npm run build     # production build → dist/ (includes manifest + service worker)
npm run preview   # serve dist/ at http://localhost:4173 to test offline + install
```

## Deploy (GitHub Pages)

The repo ships a workflow at `.github/workflows/deploy.yml`.

1. Push the repo to GitHub.
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main` (or run the workflow manually). The site goes live at `https://<user>.github.io/<repo>/`.

The build sets `VITE_BASE=/<repo>/` so the manifest, service worker and asset URLs resolve under the project path. For a user site or custom domain, change that line to `VITE_BASE=/`.

### Netlify / Vercel / any static host

```bash
npm ci
npm run build       # VITE_BASE defaults to /
```

Publish the `dist/` folder. Single-page app: route all paths to `index.html` (Pacer uses hash routes, so this only matters for the root).

## Install on iPhone

1. Open the deployed URL in **Safari** (not Chrome; iOS only installs PWAs from Safari).
2. Tap **Share** → **Add to Home Screen** → **Add**.
3. Open Pacer from the home screen. It runs full-screen (standalone), and after the first load it works with no network.

The same steps are in the app under **More → Settings → Install on iPhone**.

## Where the data lives

All state is on the device, in IndexedDB (`pacer` database): session results, lift set logs, habit checks, custom log entries, settings (5K history, wake times, shoes, theme), unlocked badges. There is no account and no server.

**Back up / move devices:** More → Settings → **Export JSON** (shares or downloads a file) · **Import JSON** restores everything. Do this before clearing Safari data.

`SessionResult` carries a reserved `strava_activity_id` so a Strava sync can attach later without a schema change.

## Layout of the code

```
src/
  data/        plan.ts, content.ts — typed loaders for the two JSON files
  lib/         pace.ts (Riegel zones, treadmill mph), streak.ts, lifts.ts, badges.ts,
               eggs.ts (easter-egg rotation), weeks.ts, stats.ts, export.ts, dates.ts
  store/       db.ts (idb), store.tsx (React context + persistence), defaults.ts
  screens/     Today, Week (Budget vs. Actual), Plan, Lifts, Stats, Log, Guide, Settings
  components/  SessionCard, LiftBody (set logger), PaceLine, HabitRow, TenMinute, Toast…
```

Build order and acceptance criteria are in `PACER_SPEC.md` §11–§12. Every `lib/*.test.ts` covers one of them.
