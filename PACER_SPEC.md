# PACER — Build Spec for Claude Code

**Read this file, then `plan.json` and `content.json`. Build exactly what's described. Do not invent training content — Pacer renders and tracks the plan in those two files; it does not design it. Ask before deviating from anything in this spec.**

---

## 1. What Pacer is

Pacer is a personal training app for one athlete: Aakash Shah, 19, freshman at Indiana University, training from a 5K base to the Indianapolis Monumental Marathon on **November 6, 2027**, with the Glacier Half Marathon (June 26) and the Mill Race Half (Sept 25) on the way, while building muscle on a three-day lifting program and fixing his sleep and eating. His coach is Claude, through Sunday check-ins in claude.ai. Pacer is the single source of truth he opens every morning.

Think "Strava-grade polish, but it only knows one person." It should feel like a real running app he'd pay for — clean, dark, fast, big numbers, nothing to configure — with his own life woven into it as quiet easter eggs.

**The one rule of the whole plan, and the app should enforce it visually:** every run is easy unless the card says otherwise. If a run is "easy" or "long", the pace shown is slow on purpose, and the card says so.

## 2. Deliverable

- A **mobile-first Progressive Web App**, installable to the iPhone home screen from Safari ("Add to Home Screen"), running full-screen (standalone), working offline after first load.
- Single athlete, no accounts, no backend for v1. All state in the browser (IndexedDB via `idb` or Dexie; localStorage is acceptable for settings) with **JSON export/import** so he can move devices or back up.
- Hosted as a static site (GitHub Pages is fine; Netlify/Vercel also fine). Provide the deploy steps in the README.
- Stack recommendation: **Vite + React + TypeScript**, Tailwind for styling, `idb` for storage, `vite-plugin-pwa` for the manifest + service worker, a tiny chart lib (Recharts or uPlot) for the stats screens. If you have a strong reason to go vanilla, fine — but keep it one app, one build, one deploy.
- Input data: `plan.json` (every day, every session, Nov 5 2026 → Nov 6 2027) and `content.json` (programs, pace engine, nutrition, sleep, rules, races, gear, swimming, habits, easter eggs, app copy). Ship both inside the app bundle. Everything the app displays as *training content* comes from these files.

## 3. The data files

### `plan.json`
```
{
  app, athlete, generated, start, end, units,
  phases: [ { id, name, start, end, goal, blocks[] } ],
  weeks:  [ { index, start, end, phase, phase_name, block, label, focus, deload, planned_miles, long_run_mi, runs, lifts } ],
  days:   [ { date, dow, phase, phase_name, block, week_index, week_label, deload, location,
              wake_time ("7:30" | "8:30" | null), habits [keys], notes [strings], egg (string | null),
              sessions: [ Session ] } ]
}
```
**Session**
```
{ id, kind: "run"|"lift"|"race"|"rest"|"off"|"travel"|"swim"|"flex",
   title, subtitle, optional (bool),
   distance_mi?, pace_key?: "easy"|"long"|"tempo"|"hills"|"strides"|"hm"|"mp"|"tt"|"shakeout",
   est_min, details: [strings], location?,
   program?: "P0_A"|"P0_B"|"LOWER"|"UPPER"|"FULL"|"FULL_LIGHT", light?: bool }
```
- `planned_miles` for a week = sum of `distance_mi` over non-optional runs and races. Optional sessions never count toward planned miles or the streak.
- Phase boundaries fall mid-week (Jan 1 is a Friday; Jun 27 is a Sunday). Each **day** carries its own `phase`/`block`; trust the day, not the week, for phase labels.
- Days inside India (Nov 15–24) have one `flex` session and no habits requirement — they always count toward the streak.

### `content.json`
Top-level keys: `app, athlete, phases, pace_engine, lift_programs, nutrition, sleep, rules, sunday_check_in, gear, swimming, races, key_dates, habits, easter_eggs, app_copy`. Render these; don't paraphrase them. Where a lift session has `program: "LOWER"`, look up `content.lift_programs.LOWER.exercises` for the exercise cards.

## 4. Screens

Bottom tab bar, thumb-reachable: **Today · Week · Plan · Lifts · Stats · More**. (More holds Log, Guide, Settings.)

### 4.1 Today (home)
The screen he opens at 7:30 AM. Top to bottom:
1. **Header**: day + date, a small chip with `phase_name · week_label` (e.g., "The Course · Week 12 · long runs go find hills"), and a countdown pill to the next race from `content.races` ("Glacier in 48 days").
2. **Easter egg line**: the day's `egg` if pinned in plan.json, otherwise one line from the rotating pool (see §7). One line, muted, never a popup.
3. **Session cards**, one per session in `day.sessions`:
   - Run card: title, subtitle, distance, **computed pace zone** (see §5) with treadmill mph for easy/long, est. minutes, `location`, expandable `details`. Big "Done" button. Secondary "Skipped" and "Partial" (partial asks for actual miles). Optional sessions show a subtle "optional" tag and a toggle to hide.
   - Lift card: title, est. minutes, location, then the exercise list from the program. Each exercise row: name, sets × reps, a **"watch"** link (opens `https://www.youtube.com/results?search_query=` + the exercise's `video_query`, URL-encoded — he learns by watching, then copying), a note if present, a "home variant" shown automatically when `day.location` is Brownsburg/Spring break/Glacier trip, and a **set logger**: N rows of weight × reps, prefilled with the last logged weights for that exercise. A **"Scale it"** button adds the progression increment (5 lb upper / 10 lb lower — see `lift_programs.general.progression`; treat squat, RDL, split squat, leg press, leg curl, calf, deadlift as lower). "Done" marks the lift complete and saves the logs.
   - Rest / off / travel / flex cards: title + details, with a single "Got it" check.
   - Race card: distinctive styling, race-day `details` fully expanded, finish time entry on Done (hh:mm:ss) which also records a PR for that distance.
4. **Habit row** (from `content.habits.daily`, filtered by `day.habits`): four tap-to-toggle chips. Show `wake_time` on the wake chip.
5. **Notes**: `day.notes` (exams, travel, logistics) in a quiet box. These are context, never tasks.
6. **Day closed state**: when all non-optional sessions are resolved (done/skipped) and ≥3 habits are hit, the screen shows `content.app_copy.all_done` and the streak increments (see §6).
7. Swipe left/right to move between days; a "Today" button returns.

### 4.2 Week — "Budget vs. Actual"
(The label comes from `easter_eggs.labels.weekly_summary`.) Mon–Sun strip with a dot per session (planned / done / skipped), **planned miles vs. actual miles** as a big pair of numbers, long run planned vs. done, lifts planned vs. done, the week's `focus` line, and a **deload** badge when `deload` is true. A "Share" button renders this card as a PNG (html-to-image) so he can send it to Claude on Sunday.

### 4.3 Plan
Phases → blocks → weeks → days, collapsible. Each week row shows planned miles, long run, runs/lifts, deload flag (use the table in Appendix A — it's derived from plan.json). Each day row shows session titles. A **race ladder** across the top: the 8 entries in `content.races` with dates, countdowns, and status (optional / recommended / register). "Jump to date" control.

### 4.4 Lifts
List of programs (`content.lift_programs`, skipping `general`), each with its exercise cards. Tapping an exercise shows its **history**: a small chart of top-set weight over time, best set, last session's sets, and estimated 1RM (Epley: weight × (1 + reps/30)) labeled "est." A **PR list** for the main lifts: back squat, bench press, deadlift, overhead press, barbell row.

### 4.5 Stats — "Soft hands. Hard data."
- Current streak + longest streak.
- Total miles since Nov 5, 2026; miles by week (bar chart, planned as a faint outline behind actual).
- Long-run progression (line).
- Running PRs by distance (seeded with `athlete.baseline_prs`, updated by race finishes and time trials).
- Lift PRs (from 4.4).
- **Badges** grid from `easter_eggs.badges` (locked = dimmed with the unlock rule; unlocked = full + date).
- Shoes — "Accumulated Depreciation": each shoe with miles / `retire_at_miles` as a progress bar. Completed runs add their miles to the active shoe; manual adjust allowed; "retire" + "add pair".

### 4.6 Log (under More)
Custom entries per `content.habits.custom_log`: quick-add sheet with type picker, free text, optional number + unit. Timeline view by day. Entries never affect the streak. A "Sunday export" button copies the last 7 days (sessions done, miles, lift top sets, habits, custom logs) as plain text to the clipboard for pasting to Claude.

### 4.7 Guide (under More)
Tabs rendering `content.nutrition`, `content.sleep`, `content.rules`, `content.sunday_check_in`, `content.gear`, `content.swimming`, `content.races`, and the phase overviews from `content.phases`. Readable typography; this is the reference he'll open when he's unsure.

### 4.8 Settings — "The Number" (under More)
- **5K time** (mm:ss) with date → recomputes every pace in the app. Keep a history list. Until he enters one, show `content.athlete.baseline_5k_label` and tag all paces "estimated". Show a live zone preview under the input.
- Wake times (defaults from `content.sleep.wake_time`).
- Shoes management.
- Theme (dark default, light optional).
- Export JSON / Import JSON / Reset (with confirmation).
- "Install on iPhone" instructions (Safari → Share → Add to Home Screen).

## 5. Pace engine

Implement exactly `content.pace_engine`:
- `p5k = five_k_seconds / 3.10686` (sec/mile).
- Riegel: `T2 = T1 × (D2 / D1)^1.06`, distances in miles, `D1 = 3.10686`.
- Zones (sec/mile):
  - easy: `p5k × 1.30` to `p5k × 1.40`
  - long: `p5k × 1.32` to `p5k × 1.45`
  - tempo: `p5k × 1.10` to `p5k × 1.15`
  - hm: Riegel(13.1094)/13.1094 × 1.00 to × 1.03
  - mp: Riegel(26.2188)/26.2188 × 1.08 to × 1.15 (deliberately conservative — first marathon at ~40 mpw)
  - shakeout = easy; tt shows last 5K pace as the reference; hills and strides are effort-only (no pace shown).
- Treadmill mph = `60 / (sec_per_mile / 60)`; display the slower end of easy/long as the treadmill setting, one decimal.
- Round displayed paces to 5-second increments; format `m:ss – m:ss /mi`.
- Worked example to test against (5K = 22:00): easy 9:10–9:55, long 9:20–10:15, tempo 7:45–8:10, hm 7:45–7:55, mp 8:40–9:15 (rounded to 5 s).
- With no 5K entered, easy/long cards show the talk-test fallback text instead of numbers.

## 6. State, streaks, badges

**Records**
- `SessionResult { date, session_id, status: 'done'|'skipped'|'partial', actual_mi?, actual_min?, finish_time_sec?, note?, loggedAt }`
- `LiftLog { date, session_id, program, exercise, sets: [{ weight, reps }], loggedAt }`
- `HabitLog { date, key, done }`
- `CustomLog { id, date, type, text, value?, unit?, loggedAt }`
- `Settings { fiveK: [{ seconds, date }], wakeTimes, theme, shoes: [{ id, name, firstRun, miles, retireAt, active }] }`
- `Badge { key, unlockedAt }`

**Streak rule** (from `content.habits.streak_rule`): a day counts when every non-optional session is resolved as done or partial (skipped breaks it) AND at least 3 of that day's habits are done. Rest/off days count on habits alone. India days always count. Compute the streak lazily from records, don't store it. A day isn't judged until it's over (local midnight), so this morning's unchecked run doesn't break anything.

**Badges**: evaluate unlock rules from `easter_eggs.badges` after every save. Show a small toast once on unlock (the only toast in the app). "Phase 0 complete with 3 runs/week since India" = at least 3 runs done in each full week from Nov 30 through Dec 27.

**Shoe miles**: completed runs (and partials, using actual miles) add to the active shoe.

## 7. Easter eggs

- **Pinned**: `day.egg` wins.
- **Rotating**: otherwise pick from `easter_eggs.rotating` by the day's dominant session (race → the race card's own details, workout → `workout`, long → `long_run`, lift-only day → `lift`, rest/off → `rest`, easy run → `easy_run`). Choose the index with a deterministic hash of the date so a day always shows the same line. Before 10 AM, 30% of the time, show a `morning` line instead.
- **His own words** (`easter_eggs.his_own_words`): each has a `show_on` trigger — wire the four that are mechanical: "day after a missed session", "10-minute rule screen", "finish of any long run" (shown in the Done confirmation for long runs), "shoe tracker".
- **Streak milestones** (`rotating.streak`): shown on the Today header the day the streak hits that number.
- **Labels** (`easter_eggs.labels`): use them as the actual screen titles / button labels listed.
- **The 10-minute rule**: a "Don't feel like it" link on any run/lift card opens a full-screen card titled with `labels.ten_minute_rule`, showing Rule 6 text and a 10:00 countdown. When it ends: "Still want to stop? It counts." with Done / Keep going.
- Respect `easter_eggs.do_not_use` absolutely.
- Tone: dry and specific. If a line would make a stranger cringe, cut it.

## 8. Design

- **Dark first.** Background `#0B0B0D`, surfaces `#151518` / `#1C1C21`, text `#F2F2F2` / muted `#9A9AA3`. One accent: **crimson `#C8102E`** (he's at IU — crimson and cream — but never use IU logos or wordmarks). Success `#34C759`-ish for done states, used sparingly. Light theme optional, same tokens inverted.
- Typography: system stack (SF on iOS) or Inter. Big tabular numerals for distances, paces, countdowns. Minimum 16 px body. 16 px side gutters, no horizontal scroll.
- Cards with 16 px radius, subtle borders, no drop-shadow soup. Generous whitespace. Motion only on state changes (check → fill, streak tick).
- Safe-area insets for the notch and the home indicator. Tab bar fixed to the bottom.
- It should feel like a real running app: calm, confident, fast. No gradients-for-the-sake-of-it, no emoji in the UI chrome, no confetti except the badge toast.

## 9. PWA / installability

- `manifest.webmanifest`: name "Pacer", short_name "Pacer", display `standalone`, background/theme color `#0B0B0D`, icons 192/512 + maskable. Provide an `apple-touch-icon` (180 px) and `<meta name="apple-mobile-web-app-capable" content="yes">`, `apple-mobile-web-app-status-bar-style` black-translucent, `viewport-fit=cover`.
- Service worker: precache the app shell and both JSON files; stale-while-revalidate for everything else. The app must open and work with no network after the first load.
- Icon: a simple "P" with a forward-leaning stroke, crimson on black. Original design — no borrowed logos.
- Optional stretch (not required for v1): local reminders at the day's wake time via the Notifications API when installed (iOS 16.4+ supports this for installed PWAs). Must degrade silently.

## 10. Non-goals for v1

No accounts, no server, no Strava sync (design the `SessionResult` so a Strava activity id can be attached later), no social features, no AI inside the app (Claude is the coach, in claude.ai), no calorie counting.

## 11. Build order

1. Scaffold (Vite + React + TS + Tailwind + PWA plugin). Load both JSON files, type them.
2. Today screen with session cards and check-offs, persisted. Day navigation.
3. Pace engine + Settings "The Number". Verify the worked example.
4. Lift cards with set logging, prefill, "Scale it", exercise history.
5. Habits + streak + day-closed state.
6. Week "Budget vs. Actual" + PNG share.
7. Plan screen + race ladder.
8. Stats + badges + shoes.
9. Log + Sunday export. Guide.
10. Easter-egg engine wired everywhere. 10-minute rule screen.
11. PWA polish, icons, offline test, iOS install test. README with deploy steps.
Commit after each step.

## 12. Acceptance criteria

- All 367 days (2026-11-05 → 2027-11-06) render; no day is empty.
- Nov 8, 2026 shows "The Slow One · 3 mi". Jan 20, 2027 shows the 5K time trial. Jun 26, 2027 and Nov 6, 2027 show race cards with details expanded.
- Entering a 5K of 22:00 produces the worked-example zones (±5 s). With no 5K entered, easy/long cards show the talk-test text.
- Marking all sessions done + 3 habits closes the day and the streak increments the next morning; skipping a non-optional session breaks it; optional sessions never affect it; India days count.
- Week planned miles equal `plan.weeks[i].planned_miles` for every week.
- Lift set logger prefills the last logged weights per exercise; "Scale it" adds 5 lb upper / 10 lb lower.
- Export → clear → import restores everything.
- Works offline after first load; installs to the iPhone home screen and opens standalone.
- No training text appears in the app that isn't in plan.json or content.json (UI chrome and labels excepted).
- `easter_eggs.do_not_use` is respected everywhere.

## Appendix A — Week table (derived from plan.json)

| # | Week of | Phase · Block | Label | Planned mi | Long run | Runs | Lifts | Deload |
|---|---|---|---|---|---|---|---|---|
| 1 | 2026-11-02 | P0 · On-Ramp | Gentle restart | 3.0 | 0.0 | 1 | 0 |  |
| 2 | 2026-11-09 | P0 · On-Ramp | First lifts back | 6.0 | 0.0 | 2 | 2 |  |
| 3 | 2026-11-16 | P0 · On-Ramp | India | 0.0 | 0.0 | 0 | 0 |  |
| 4 | 2026-11-23 | P0 · On-Ramp | Home — the reset | 6.0 | 0.0 | 2 | 1 |  |
| 5 | 2026-11-30 | P0 · On-Ramp | The real thing, week 1 | 10.0 | 4 | 3 | 2 |  |
| 6 | 2026-12-07 | P0 · On-Ramp | The real thing, week 2 | 10.5 | 4.5 | 3 | 2 |  |
| 7 | 2026-12-14 | P0 · On-Ramp | Finals week | 6.0 | 0.0 | 2 | 1 | yes |
| 8 | 2026-12-21 | P0 · On-Ramp | Winter break, week 1 | 12.0 | 5 | 3 | 2 |  |
| 9 | 2026-12-28 | P0 · On-Ramp | Winter break, week 2 → Phase 1 kickoff | 12.0 | 5 | 3 | 3 |  |
| 10 | 2027-01-04 | P1 · Foundation | Week 1 · home | 12.5 | 5.5 | 3 | 3 |  |
| 11 | 2027-01-11 | P1 · Foundation | Week 2 · classes begin | 14.0 | 6 | 3 | 3 |  |
| 12 | 2027-01-18 | P1 · Foundation | Week 3 · time trial | 15.1 | 6.5 | 3 | 3 |  |
| 13 | 2027-01-25 | P1 · Foundation | Week 4 · deload | 11.0 | 5 | 3 | 3 | yes |
| 14 | 2027-02-01 | P1 · Foundation | Week 5 | 16.0 | 7 | 3 | 3 |  |
| 15 | 2027-02-08 | P1 · Build | Week 6 · first workout, fourth run | 18.5 | 7 | 4 | 3 |  |
| 16 | 2027-02-15 | P1 · Build | Week 7 | 20.0 | 8 | 4 | 3 |  |
| 17 | 2027-02-22 | P1 · Build | Week 8 · deload | 15.0 | 6 | 4 | 3 | yes |
| 18 | 2027-03-01 | P1 · Build | Week 9 | 21.0 | 8.5 | 4 | 3 |  |
| 19 | 2027-03-08 | P1 · Build | Week 10 · first hills | 21.5 | 9 | 4 | 3 |  |
| 20 | 2027-03-15 | P1 · Build | Week 11 · spring break / deload | 16.0 | 6 | 4 | 3 | yes |
| 21 | 2027-03-22 | P1 · Hills | Week 12 · long runs go find hills | 22.0 | 9 | 4 | 3 |  |
| 22 | 2027-03-29 | P1 · Hills | Week 13 · first 10 | 24.0 | 10 | 4 | 3 |  |
| 23 | 2027-04-05 | P1 · Hills | Week 14 · 10-Miler | 22.0 | 10 | 4 | 2 |  |
| 24 | 2027-04-12 | P1 · Hills | Week 15 · recovery | 17.0 | 7 | 4 | 3 | yes |
| 25 | 2027-04-19 | P1 · Hills | Week 16 | 25.0 | 11 | 4 | 3 |  |
| 26 | 2027-04-26 | P1 · Hills | Week 17 · peak before the Mini | 26.0 | 12 | 4 | 3 |  |
| 27 | 2027-05-03 | P1 · Hills | Week 18 · finals + the Mini | 22.1 | 13.1 | 4 | 1 | yes |
| 28 | 2027-05-10 | P1 · Peak & Taper | Week 19 · recovery at home | 17.0 | 7 | 4 | 3 | yes |
| 29 | 2027-05-17 | P1 · Peak & Taper | Week 20 | 26.0 | 11 | 4 | 3 |  |
| 30 | 2027-05-24 | P1 · Peak & Taper | Week 21 | 27.0 | 12 | 4 | 3 |  |
| 31 | 2027-05-31 | P1 · Peak & Taper | Week 22 · peak | 29.0 | 12 | 4 | 2 |  |
| 32 | 2027-06-07 | P1 · Peak & Taper | Week 23 | 28.0 | 11 | 4 | 2 |  |
| 33 | 2027-06-14 | P1 · Peak & Taper | Week 24 · taper 1 | 19.0 | 7 | 4 | 2 | yes |
| 34 | 2027-06-21 | P1 · Peak & Taper | Week 25 · RACE WEEK · Glacier | 21.1 | 13.1 | 4 | 1 | yes |
| 35 | 2027-06-28 | P2 · Recover | Week 26 · recover from Glacier | 7.0 | 0.0 | 2 | 3 | yes |
| 36 | 2027-07-05 | P2 · Recover | Week 27 | 12.0 | 0.0 | 3 | 3 | yes |
| 37 | 2027-07-12 | P2 · Summer Base | Week 28 · base begins | 25.0 | 10 | 4 | 3 |  |
| 38 | 2027-07-19 | P2 · Summer Base | Week 29 | 27.0 | 11 | 4 | 3 |  |
| 39 | 2027-07-26 | P2 · Summer Base | Week 30 | 30.0 | 12 | 4 | 3 |  |
| 40 | 2027-08-02 | P2 · Summer Base | Week 31 · deload | 22.0 | 9 | 4 | 3 | yes |
| 41 | 2027-08-09 | P2 · Summer Base | Week 32 | 32.0 | 13 | 4 | 3 |  |
| 42 | 2027-08-16 | P2 · Summer Base | Week 33 · last summer week | 34.0 | 14 | 4 | 3 |  |
| 43 | 2027-08-23 | P2 · Marathon Build | Week 34 · back at IU | 35.0 | 14 | 5 | 2 |  |
| 44 | 2027-08-30 | P2 · Marathon Build | Week 35 · first 16 | 38.0 | 16 | 5 | 2 |  |
| 45 | 2027-09-06 | P2 · Marathon Build | Week 36 · cutback | 30.0 | 12 | 5 | 2 | yes |
| 46 | 2027-09-13 | P2 · Marathon Build | Week 37 · 40 | 40.0 | 16 | 5 | 2 |  |
| 47 | 2027-09-20 | P2 · Marathon Build | Week 38 · Mill Race | 28.1 | 13.1 | 5 | 1 | yes |
| 48 | 2027-09-27 | P2 · Peak | Week 39 · recover from the half | 29.0 | 12 | 5 | 2 | yes |
| 49 | 2027-10-04 | P2 · Peak | Week 40 · the 18 | 41.0 | 18 | 5 | 2 |  |
| 50 | 2027-10-11 | P2 · Peak | Week 41 · THE 20 | 40.0 | 20 | 5 | 2 |  |
| 51 | 2027-10-18 | P2 · Peak | Week 42 · cutback | 32.0 | 14 | 5 | 2 | yes |
| 52 | 2027-10-25 | P2 · Taper | Week 43 · taper | 25.0 | 10 | 5 | 1 | yes |
| 53 | 2027-11-01 | P2 · Taper | Week 44 · RACE WEEK · Monumental | 34.2 | 26.2 | 4 | 0 | yes |

## Appendix B — Race ladder

| Date | Race | Distance | Role |
|---|---|---|---|
| 2027-01-20 | 5K time trial (solo) | 3.1 | Sets every pace |
| 2027-02-13 | 500 Festival 3-Miler | 3 | optional |
| 2027-03-13 | 500 Festival 6-Miler | 6 | optional |
| 2027-04-10 | 500 Festival 10-Miler | 10 | recommended |
| 2027-05-08 | Indy Mini | 13.1 | dress rehearsal |
| 2027-06-26 | Glacier Half | 13.1 | Phase 1 finish line |
| 2027-09-25 | Mill Race Half | 13.1 | marathon tune-up |
| 2027-11-06 | Indianapolis Monumental | 26.2 | THE GOAL |
