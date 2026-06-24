# Project Status

_Last updated: 2026-06-24_

---

## What is complete

### Engine (`lib/engine/`) ✅
All scheduling logic is implemented and unit-tested:
- Base rotation builder (B B A A C C OFF, phase-offset per employee)
- Surplus G-shift distribution
- Absence coverage: relief → 12-hr pair → TIGHT/INFEASIBLE flag
- Rest-hour constraint enforcement (e.g. no A after C)
- Manpower stats (BALANCED / SHORT / SURPLUS)
- Cumulative 12-hr fairness across `cumulative12hrCount`
- Tallies (hours, off days, 12-hr count, nights per employee)

### Database (`prisma/`) ✅
- Schema: `Unit`, `Employee`, `LeaveRequest`, `ScheduleEntry`, `FeasibilityFlag`
- Migrations applied
- Seed script at `prisma/seed.ts` — creates 2 units with realistic employee rosters and leave requests

### API routes (`app/api/`) ✅
Full REST surface:
- Units CRUD
- Employees CRUD (auto-assigns `seniorityIndex`)
- Leave requests CRUD (with date-range filter)
- Schedule GET (returns entries + flags + computed tallies)
- Schedule POST /generate (runs engine, bulk-saves results)
- Schedule PUT /[entryId] (manual override, sets `isManualOverride = true`)
- Schedule GET /export (downloads `.xlsx` file)

### UI (`app/`) ✅
- Dashboard: unit cards with BALANCED/SHORT/SURPLUS badge
- Schedule grid: month nav, colour-coded cells, feasibility alerts, tally columns
- Manual override: click any cell → modal → select shift (override shows violet ring)
- Employees tab: add / edit / delete with flag checkboxes
- Leaves tab: add / delete with date range + type (PLANNED / EMERGENCY)
- Settings tab: edit unit config + delete unit (danger zone)
- Excel export button on schedule page

### Seeded test data ✅
Two units generated and scheduled for July + August 2026:

| Unit | Employees | Config | July flags |
|---|---|---|---|
| ICU North | 11 (Alice is G-fixed senior) | 3/shift · 3 shifts · 1 off | 7 TIGHT (leave days) |
| Emergency Dept | 8 (Lena is G-fixed senior) | 2/shift · 3 shifts · 1 off · 10hr rest | 7 TIGHT (leave + short roster) |

---

## Known issues / watch-outs

### DATABASE_URL must be absolute on Windows
`file:./prisma/dev.db` fails silently with `SQLITE_CANTOPEN` in the Prisma JS client
on Windows. The `.env` must use a full absolute path:
```
DATABASE_URL="file:E:/ShiftSchedule/prisma/dev.db"
```
See `.env.example`. If you move the repo, update `.env` accordingly.

### No authentication
The app has no login/auth layer. It is intended as a single-tenant internal tool.

### Manual override survives regeneration
When "Generate Schedule" is clicked, the engine is given existing manual overrides
as `existingCells` and re-applies them. Override cells are stored with
`isManualOverride = true` in the DB. They are **not** wiped by regeneration.

### cumulative12hrCount is not persisted after generation
The engine mutates `cumulative12hrCount` in memory during a run to fairly distribute
12-hr duties, but this updated count is **not written back** to the `Employee` table.
For true long-term fairness tracking, the seed should be updated or a migration added
to persist these counts after each month's generation.

---

## What is NOT built yet

- [ ] Multi-month schedule view / calendar
- [ ] Competency-level constraints (field exists in DB, engine ignores it)
- [ ] 12-hr fairness window (`twelveHrFairnessWindow` stored but not used by engine)
- [ ] Shift time overrides per unit (`shiftTimeOverrides` JSON field stored but not surfaced in UI)
- [ ] Notes per schedule entry (field exists, not editable in UI)
- [ ] Employee seniority reordering in UI (drag-and-drop)
- [ ] Print-friendly schedule view
- [ ] Authentication / multi-user

---

## How to resume

```bash
# 1. Copy and edit .env (set absolute path to prisma/dev.db)
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Generate Prisma client
npm run db:generate

# 4. Reset and seed test data
npm run db:seed

# 5. Start dev server
npm run dev
# → http://localhost:3000
```
