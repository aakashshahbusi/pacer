// ---- plan.json ------------------------------------------------------------

export type SessionKind = 'run' | 'lift' | 'race' | 'rest' | 'off' | 'travel' | 'swim' | 'flex'
export type PaceKey = 'easy' | 'long' | 'tempo' | 'hills' | 'strides' | 'hm' | 'mp' | 'tt' | 'shakeout'
export type ProgramKey = 'P0_A' | 'P0_B' | 'LOWER' | 'UPPER' | 'FULL' | 'FULL_LIGHT'

export interface Session {
  id: string
  kind: SessionKind
  title: string
  subtitle: string
  optional: boolean
  distance_mi?: number
  pace_key?: PaceKey
  est_min: number
  details: string[]
  location?: string
  program?: ProgramKey
  light?: boolean
}

export interface PlanDay {
  date: string // YYYY-MM-DD
  dow: string
  phase: number
  phase_name: string
  block: string
  week_index: number
  week_label: string
  deload: boolean
  location: string
  wake_time: string | null
  habits: string[]
  notes: string[]
  egg: string | null
  sessions: Session[]
}

export interface PlanWeek {
  index: number
  start: string
  end: string
  phase: number
  phase_name: string
  block: string
  label: string
  focus: string
  deload: boolean
  planned_miles: number
  long_run_mi: number
  runs: number
  lifts: number
}

export interface PlanPhase {
  id: number
  name: string
  start: string
  end: string
  goal: string
  blocks: string[]
}

export interface Plan {
  app: string
  athlete: string
  generated: string
  start: string
  end: string
  units: string
  phases: PlanPhase[]
  weeks: PlanWeek[]
  days: PlanDay[]
}

// ---- content.json ---------------------------------------------------------

export interface Exercise {
  name: string
  sets: number
  reps: string
  rest: string
  note: string | null
  home_variant: string | null
  video_query: string
}

export interface LiftProgram {
  title: string
  phase?: number | string
  duration_min?: number
  exercises: Exercise[]
}

export interface Race {
  date: string
  name: string
  distance_mi: number
  where: string
  role: string
  status: string
  url?: string
  start?: string
  course?: string
}

export interface ContentPhaseBlock {
  name: string
  dates: string
  mileage: string
  long_run: string
  lifts: number | string
  note: string
}

export interface ContentPhase {
  id: number
  name: string
  dates: string
  one_liner: string
  what_done_looks_like: string
  template: Record<string, string>
  rule?: string
  blocks?: ContentPhaseBlock[]
}

export interface HabitDef {
  key: string
  label: string
  detail: string
  starts?: string
}

export interface OwnWords {
  text: string
  source: string
  show_on: string
}

export interface BadgeDef {
  key: string
  name: string
  unlock: string
  desc: string
}

export interface Content {
  app: { name: string; tagline: string; athlete: string; units: string; coach: string; start: string; end: string }
  athlete: {
    name: string
    home: string
    school: string
    gym_iu: string
    gym_home: string
    winter_running: string
    summer_running: string
    shoes: { name: string; first_run: string; retire_at_miles: number; note: string }[]
    baseline_prs: Record<string, { time: string; seconds: number; date: string; note?: string }>
    baseline_5k_seconds_for_pace_engine: number
    baseline_5k_label: string
    weekly_check_in: string
  }
  phases: ContentPhase[]
  pace_engine: {
    description: string
    input: { field: string; default: number; default_label: string }
    formulas: {
      p5k_sec_per_mile: string
      riegel_time: string
      zones_sec_per_mile: Record<string, string[]>
      marathon_note: string
      treadmill_mph: string
      display: string
    }
    worked_example_22_00_5k: Record<string, string>
    talk_test_fallback: string
  }
  lift_programs: {
    general: Record<string, string>
    bodyweight_fallback: LiftProgram
  } & Record<ProgramKey, LiftProgram>
  nutrition: {
    principle: string
    the_loop: string
    breakfast: { where: string; what: string; when: string }
    lunch_dinner: { where: string; what: string; note: string }
    late_night: { rule: string; costco_list: string[] }
    run_fueling: Record<string, string>
    muscle_note: string
  }
  sleep: {
    wake_time: Record<string, string>
    bedtime: string
    guardrails: string[]
    reset: string
    morning_sequence: string
    data: string
  }
  rules: { n: number; name: string; text: string }[]
  sunday_check_in: {
    when: string
    how: string
    claude_pulls_from_strava: string[]
    you_report: string[]
    you_get: string
    monthly: string
    pacer_export: string
  }
  gear: { item: string; when: string; note: string }[]
  swimming: { starts: string; first_session: string; fast_path: string; why: string }
  races: Race[]
  key_dates: { date: string; what: string }[]
  habits: {
    daily: HabitDef[]
    streak_rule: string
    custom_log: { description: string; types: string[]; rule: string }
  }
  easter_eggs: {
    principle: string
    his_own_words: OwnWords[]
    rotating: {
      easy_run: string[]
      long_run: string[]
      workout: string[]
      lift: string[]
      rest: string[]
      missed: string[]
      morning: string[]
      streak: Record<string, string>
    }
    badges: BadgeDef[]
    labels: Record<string, string>
    places: string[]
    do_not_use: string
  }
  app_copy: Record<string, string>
}

// ---- records (IndexedDB) --------------------------------------------------

export type SessionStatus = 'done' | 'skipped' | 'partial'

export interface SessionResult {
  date: string
  session_id: string
  status: SessionStatus
  actual_mi?: number
  actual_min?: number
  finish_time_sec?: number
  note?: string
  strava_activity_id?: string // reserved for a later Strava sync
  loggedAt: string
}

export interface LiftSet {
  weight: number | null
  reps: number | null
}

export interface LiftLog {
  date: string
  session_id: string
  program: ProgramKey | string
  exercise: string
  sets: LiftSet[]
  loggedAt: string
}

export interface HabitLog {
  date: string
  key: string
  done: boolean
}

export interface CustomLog {
  id: string
  date: string
  type: string
  text: string
  value?: number
  unit?: string
  loggedAt: string
}

export interface Shoe {
  id: string
  name: string
  firstRun: string
  miles: number
  retireAt: number
  active: boolean
  retired?: boolean
}

export interface FiveKEntry {
  seconds: number
  date: string
}

export interface Settings {
  fiveK: FiveKEntry[]
  wakeTimes: Record<string, string>
  theme: 'dark' | 'light'
  shoes: Shoe[]
  hiddenOptional: string[] // session ids hidden on Today
}

export interface Badge {
  key: string
  unlockedAt: string
}

export interface ExportBundle {
  app: 'Pacer'
  version: 1
  exportedAt: string
  sessionResults: SessionResult[]
  liftLogs: LiftLog[]
  habitLogs: HabitLog[]
  customLogs: CustomLog[]
  settings: Settings
  badges: Badge[]
}
