# Project Context — ShiftSchedule

## What this is
A Next.js 15 (App Router) shift-scheduling web app backed by SQLite via Prisma 5.
The scheduling logic lives in a **pure TypeScript engine** with no DB or React deps.
The app generates monthly rotas for hospital-style units with rotating A/B/C shifts,
leave coverage, 12-hr duty pairs, and feasibility flags.

---

## Stack
| Layer | Choice |
|---|---|
| Framework | Next.js 15.2.4 · App Router · React 19 |
| Database | SQLite (Prisma 5.22.0) |
| Styling | Tailwind CSS v3 (custom shift colours in `tailwind.config.ts`) |
| Testing | Vitest (engine-only tests in `lib/engine/__tests__/`) |
| Export | `xlsx` package for Excel download |
| Runtime | Node.js on Windows 11 |

---

## Repository layout
```
lib/
  engine/          Pure TS scheduling engine — no DB/React deps
    index.ts       generateSchedule() entry point
    types.ts       ShiftCode, UnitConfig, EngineEmployee, etc.
    rotation.ts    Base rotation builder (B B A A C C OFF cycle)
    coverage.ts    Absence coverage: relief → 12-hr pair → TIGHT/INFEASIBLE flag
    manpower.ts    computeManpower() — BALANCED / SHORT / SURPLUS
    tallies.ts     computeTallies() — hours, nights, 12hr count per employee
    dates.ts       Pure date helpers (no timezone magic)
    rest.ts        hasEnoughRest() — rest-hour constraint checks
    __tests__/     engine.test.ts (Vitest)
  prisma.ts        PrismaClient singleton (global cache for dev hot-reload)

prisma/
  schema.prisma    Models: Unit, Employee, LeaveRequest, ScheduleEntry, FeasibilityFlag
  seed.ts          Seed script — 2 units, 19 employees, 6 leave requests
  migrations/      Prisma migration history
  dev.db           SQLite file (gitignored — run npm run db:seed to recreate)

app/
  layout.tsx       Root layout — slate-800 top nav bar
  page.tsx         Dashboard — unit cards with BALANCED/SHORT/SURPLUS badge
  globals.css      Tailwind base
  _components/
    ShiftBadge.tsx  Coloured shift badge (uses tailwind.config.ts colours)
  units/
    new/page.tsx                  Create-unit form (client component)
    [unitId]/
      layout.tsx                  Fetches unit, renders TabNav + children
      page.tsx                    Redirect → /schedule
      _components/TabNav.tsx      Active-tab nav (client, uses usePathname)
      schedule/
        page.tsx                  Server component — fetches unit+employees
        _components/
          ScheduleClient.tsx      Client grid: month nav, generate, override modal, export
      employees/
        page.tsx                  Server — initial fetch
        _components/
          EmployeesClient.tsx     Client CRUD table + inline add/edit form
      leaves/
        page.tsx                  Server — initial fetch
        _components/
          LeavesClient.tsx        Client CRUD table + add form
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
        generate/route.ts         POST {start, end} → runs engine, bulk-upserts to DB
        export/route.ts           GET ?start=&end= → .xlsx download (xlsx package)
        [entryId]/route.ts        PUT {shiftCode} → sets isManualOverride=true
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
| OFF | — | Rest day |

### Rotation logic
- 7-day cycle: B B A A C C OFF  
- Phase offset per employee = `floor(i × 7 / personsPerShift)`  
- Surplus employees get G-shift on over-staffed days  
- Non-rotating employees (`doesRotatingShift = false`) always get G or OFF

### Absence coverage priority
1. G-person with `givesLeaveBackup = true` who passes rest check → pulled to absent shift  
2. Form a D12 + N12 pair from the complementary shifts (fairness by `cumulative12hrCount`)  
3. If neither works → flag as TIGHT or INFEASIBLE

### Feasibility flags
Stored in `FeasibilityFlag` table. Surfaced as coloured alerts on the schedule grid.
The `suggestion` field is a JSON blob with a best-effort rota.

---

## DATABASE_URL gotcha (Windows)
Relative paths in `DATABASE_URL` (e.g. `file:./prisma/dev.db`) **do not work** for
the Prisma JS client inside Next.js on Windows. Use an absolute path:

```
DATABASE_URL="file:E:/ShiftSchedule/prisma/dev.db"
```

The `.env.example` documents this. The `.env` itself is gitignored.

---

## npm scripts
| Script | What it does |
|---|---|
| `npm run dev` | Start Next.js dev server on :3000 |
| `npm run build` | Production build |
| `npm run db:seed` | Wipe DB and insert 2 units + 19 employees + 6 leaves |
| `npm run db:migrate` | Run pending Prisma migrations |
| `npm run db:generate` | Regenerate Prisma client after schema changes |
| `npm run db:studio` | Open Prisma Studio (GUI for the DB) |
| `npm run test` | Run Vitest engine tests |

---

## tsconfig note
`"target": "ES2017"` was added to fix TS2802 errors on Map iteration in the engine.
The original tsconfig had no target (defaulted to ES3).
