# Project Context — ShiftSchedule

## What this is
A Next.js 16 (App Router) shift-scheduling web app backed by PostgreSQL (Neon) via Prisma 5.
The scheduling logic lives in a **pure TypeScript engine** with no DB or React deps.
The app generates rotas for **refinery** units with rotating A/B/C shifts,
leave coverage, 12-hr duty pairs, feasibility flags, and AI-powered insights.
Deployed to production on Vercel — see `status.md` for the live URL and deployment history.

---

## Stack
| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.9 · App Router · React 19 |
| Database | PostgreSQL via Neon, free tier (Prisma 5.22.0) |
| Styling | Tailwind CSS v3 (custom shift colours in `tailwind.config.ts`) |
| AI | Groq (LLaMA models) via direct fetch to OpenAI-compatible API (`lib/ai.ts`) |
| Testing | Vitest (engine-only tests in `lib/engine/__tests__/`) |
| Export | `xlsx` package for Excel download |
| Runtime | Node.js on Windows 11 (deploys to Vercel serverless functions in production) |

---

## Repository layout
```
lib/
  engine/          Pure TS scheduling engine — no DB/React deps
    index.ts       generateSchedule() entry point
    types.ts       ShiftCode, UnitConfig, EngineEmployee, AbsentEntry, etc.
    rotation.ts    Base rotation builder (B B A A C C OFF cycle)
    coverage.ts    coverAbsences() — relief → 12-hr pair → TIGHT/INFEASIBLE/INFO flag
    manpower.ts    computeManpower() — BALANCED / SHORT / SURPLUS
    tallies.ts     computeTallies() — hours, nights, 12hr count per employee
    dates.ts       Pure date helpers (no timezone magic)
    rest.ts        hasEnoughRest() — rest-hour constraint checks
    __tests__/     engine.test.ts (Vitest)
  prisma.ts        PrismaClient singleton (global cache for dev hot-reload)
  ai.ts            Groq API shim — exposes genAI / AI_SMART / AI_FAST / aiAvailable()
                   AI_SMART = llama-3.3-70b-versatile (fairness, anomalies, leave impact)
                   AI_FAST  = llama-3.1-8b-instant  (schedule summary)
                   Query route uses AI_SMART for accuracy
                   No globalThis cache — reads GROQ_API_KEY fresh on every module load

prisma/
  schema.prisma    Models: Unit, Employee, LeaveRequest, ScheduleEntry,
                   FeasibilityFlag, FinalizedSchedule
  seed.ts          Seed script — 12 refinery units (HCU H2U CDU VDU MSP DCU OM&S ASPU DHDT SRB SDU WHFU),
                   ~112 employees with Indian names, ~26 leave requests, 13 login users
  migrations/      Prisma migration history
  dev.db           SQLite file (gitignored — run npm run db:seed to recreate)

app/
  layout.tsx       Root layout — slate-800 top nav bar
  page.tsx         Dashboard — unit cards with BALANCED/SHORT/SURPLUS badge
  globals.css      Tailwind base
  _components/
    ShiftBadge.tsx  Coloured shift badge (A/B/C/G/D12/N12/OFF/L)
  units/
    new/page.tsx                  Create-unit form (client component)
    [unitId]/
      layout.tsx                  Fetches unit, renders TabNav + children
      page.tsx                    Redirect → /schedule
      _components/TabNav.tsx      Active-tab nav: Schedule · Employees · Leaves · Reports · Settings
      finalized/
        [finalizedId]/
          page.tsx              Read-only snapshot grid — green "Finalized" badge,
                                flags from snapshot, "Back to Schedule" link
      schedule/
        page.tsx                  Server component — fetches unit (passes unitName +
                                  personsPerShift), employees, entries, flags, tallies
                                  for requested range; passes all as SSR props
        _components/
          ScheduleClient.tsx      Client grid: date pickers, generate, AI Audit button,
                                  Finalize modal (with AI auto-label), finalized list,
                                  AI Ask chat panel, override modal, export link
                                  buildScheduleContext() formats data as date-indexed
                                  daily assignments (e.g. "2026-06-06 (Sat): A: Alice, B: Bob")
      employees/
        page.tsx                  Server — initial fetch
        _components/
          EmployeesClient.tsx     Client CRUD table (shows Off Days column)
      leaves/
        page.tsx                  Server — initial fetch
        _components/
          LeavesClient.tsx        Client CRUD table + add form with AI Coverage
                                  Impact panel (risk badge + analysis before saving)
      reports/
        page.tsx                  Server — fetches L/D12/N12 entries for date range
        _components/
          ReportsClient.tsx       Leave Summary + 12-Hr Duty Summary tables +
                                  AI Pattern Insights section (anomaly detection)
      settings/
        page.tsx                  Client — edit unit config + danger-zone delete

  api/units/
    route.ts                      GET list · POST create
    [unitId]/
      route.ts                    GET · PUT · DELETE
      employees/
        route.ts                  GET list · POST create (auto-seniority index)
        [empId]/route.ts          PUT · DELETE
      leaves/
        route.ts                  GET (with ?start=&end= filter) · POST
        [leaveId]/route.ts        DELETE
      schedule/
        route.ts                  GET ?start=&end= → entries + flags + computed tallies
        generate/route.ts         POST {start, end} → runs engine, bulk-upserts to DB,
                                  persists tallies (offDays, 12hrCount) back to Employee
        export/route.ts           GET ?start=&end= → .xlsx download (xlsx package)
        [entryId]/route.ts        PUT {shiftCode} → sets isManualOverride=true
      reports/
        route.ts                  GET ?start=&end= → leave + 12hr duty summary per employee
      finalized/
        route.ts                  GET → list metadata · POST {start, end, label?} → snapshot
        [finalizedId]/
          route.ts                GET → full snapshot JSON · DELETE → remove record
      ai/
        leave-impact/route.ts     POST {employeeId, startDate, endDate}
                                  → {risk, headline, details, recommendation}
                                  Model: llama-3.3-70b-versatile (AI_SMART)
        query/route.ts            POST {question, context} → streaming plain-text answer
                                  Model: llama-3.3-70b-versatile (AI_SMART)
        fairness-audit/route.ts   POST {start, end} → structured JSON: {verdict, summary,
                                  hoursDistribution, nightBurden, twelveHrDistribution,
                                  offDayFairness, action} (session 9 — was free-text markdown)
                                  Model: llama-3.3-70b-versatile (AI_SMART)
        schedule-summary/route.ts POST {start, end} → {summary: string}
                                  Model: llama-3.1-8b-instant (AI_FAST)
        anomalies/route.ts        POST (no body) → {analysis: string}
                                  Model: llama-3.3-70b-versatile (AI_SMART)
                                  Requires ≥2 finalized schedules
  api/debug-ai/route.ts           GET → tests Groq key + model, returns {keySet, keyPrefix,
                                  model, aiAvailable, result} — useful for diagnosing AI issues
```

---

## Key domain concepts

### Shift codes
| Code | Hours | Notes |
|---|---|---|
| A | 06:00–14:00 | Morning (8 hr) |
| B | 14:00–22:00 | Afternoon (8 hr) |
| C | 22:00–06:00 | Night (8 hr, crosses midnight) |
| G | 08:00–16:00 | General / day duty (non-rotating or surplus) |
| D12 | 06:00–18:00 | 12-hr day (absence cover) |
| N12 | 18:00–06:00 | 12-hr night (absence cover) |
| OFF | — | Rest day (rotation or natural) |
| L | — | Leave day (working day replaced by leave) |

**L vs OFF rule:** when an employee is on approved leave, the engine checks the base rotation.
- If the rotation already says OFF (natural rest day) → keep OFF, leave doesn't consume a working day.
- If the rotation says A/B/C/G → replace with L, record the vacated shift in `absentByDate`.

### Rotation logic
- 7-day cycle: **B B A A C C OFF** (3-shift, `shiftsPerDay = 3`) or **A A A B B B OFF** (2-shift, `shiftsPerDay = 2`)
- Cycle selected automatically in `buildBaseRotation` based on `config.shiftsPerDay`
- Phase offset per employee = `floor(i × 7 / personsPerShift)`
- Surplus employees get G-shift on over-staffed days (only A/B checked for 2-shift units — C never produced)
- Non-rotating employees (`doesRotatingShift = false`) always get G or OFF

### Absence coverage priority
1. G-person with `givesLeaveBackup = true` who passes rest check → pulled to absent shift
2. Form a D12 + N12 pair from the complementary shifts (fairness by `cumulative12hrCount`)
3. If neither works → flag as TIGHT or INFEASIBLE

### Feasibility flags
| Level | Colour | Meaning |
|---|---|---|
| INFO | Blue (collapsible) | Absence fully covered — shows who was on leave and who got D12/N12 |
| TIGHT | Yellow | Short by ≥1 person but partial coverage achieved |
| INFEASIBLE | Red | No coverage possible |

Message format: `"David Khan (B) on leave — D12: Carol Das, N12: Frank Nair"`

### Finalized schedules
A `FinalizedSchedule` is a point-in-time immutable JSON snapshot of the live schedule.
Snapshot contains: `{ employees, cells, flags, tallies }`.
Regenerating or overriding the live schedule does not alter existing finalized records.

### AI features
All AI features use Groq via `lib/ai.ts` — a fetch-based shim with the same interface
as `@google/generative-ai`. Core scheduling logic is untouched.
All routes check `aiAvailable()` and return HTTP 503 if `GROQ_API_KEY` is unset.
Free key from console.groq.com → API Keys — no credit card required.

Schedule Query context is formatted as date-indexed daily assignments so the AI can
directly answer "who is on B shift on date X" without counting grid columns.

| Feature | Route | Trigger | What it does |
|---|---|---|---|
| Leave Impact | `ai/leave-impact` | Add Leave form | Risk badge + explanation before approving leave |
| Schedule Query | `ai/query` | Ask AI chat panel | Streaming answer to natural-language schedule questions |
| Fairness Audit | `ai/fairness-audit` | "✦ AI Audit" button | Structured JSON verdict + per-dimension cards on hour/night/12hr/off-day distribution (session 9 redesign — was free-text) |
| Auto-label | `ai/schedule-summary` | Finalize modal | Generates a descriptive label for the finalized snapshot |
| Anomaly Detection | `ai/anomalies` | Reports page | Detects patterns across ≥2 finalized schedule periods |

---

## SSR data-loading pattern for the schedule page

`app/units/[unitId]/schedule/page.tsx` is a `force-dynamic` async server component.
It reads `searchParams.start` / `searchParams.end` (YYYY-MM-DD, defaults to current
calendar month), fetches entries + flags from Prisma, runs `computeTallies()`, then renders:

```tsx
<ScheduleClient
  unitId={unitId}
  unitName={unit.name}           // used by AI query context builder
  personsPerShift={unit.personsPerShift}
  initStart={initStart}
  initEnd={initEnd}
  employees={...}
  initialEntries={...}
  initialFlags={...}
  initialTallies={...}
/>
```

`ScheduleClient` initialises state from these props. A `ssrRange` guard skips the
client fetch on first load; `useEffect` only fires when the range changes away from
the SSR-provided value.

---

## DATABASE_URL (PostgreSQL / Neon)
Migrated from SQLite to PostgreSQL in session 8 for Vercel compatibility (the Prisma JS
client can't open a local SQLite file inside a serverless function). `.env` now holds a
Neon connection string:
```
DATABASE_URL="postgresql://neondb_owner:...@...neon.tech/neondb?sslmode=require"
```
The canonical working directory is `E:\ShiftScheduleApp` (cloned from GitHub).

---

## tsconfig note
`"target": "ES2017"` was added to fix TS2802 errors on Map iteration in the engine.

---

## npm scripts
| Script | What it does |
|---|---|
| `npm run dev` | Start Next.js dev server on :3000 |
| `npm run build` | Production build |
| `npm run db:seed` | Wipe DB and insert 12 refinery units + ~112 employees + ~26 leaves + 13 login users |
| `npm run db:migrate` | Run pending Prisma migrations |
| `npm run db:generate` | Regenerate Prisma client after schema changes |
| `npm run db:studio` | Open Prisma Studio (GUI for the DB) |
| `npm run test` | Run Vitest engine tests |
