# Pacer — starter kit

Three files. Drop this folder anywhere, open Claude Code in it, and say:

> Read PACER_SPEC.md, plan.json and content.json. Build Pacer exactly as specified, following the build order in §11. Don't change any training content. Commit after each step.

| File | What it is |
|---|---|
| `PACER_SPEC.md` | The full build spec: screens, data model, pace engine, streaks, badges, easter eggs, design, PWA, acceptance criteria. |
| `plan.json` | Every day from Nov 5, 2026 to Nov 6, 2027 — 367 days, 53 weeks, 396 sessions (runs, lifts, rests, races, travel), with notes, habits and pinned easter eggs. |
| `content.json` | Everything that isn't a dated session: lift programs with home variants, pace formulas, nutrition, sleep, the 7 rules, Sunday check-in, gear, swimming, the race ladder, habits, custom logging, the easter-egg pool, badges, app copy. |

The plan is coached by Claude. Sunday check-ins happen in claude.ai; adjustments come back as an updated `plan.json`, which the app should treat as data (never hand-edit training content inside the app code).
