# Project Status

_Last updated: 2026-06-25 (session 7)_

---

## What is complete

### Engine (`lib/engine/`) ✅
All scheduling logic is implemented and unit-tested:
- Base rotation builder — **3-shift** (`B B A A C C OFF`) or **2-shift** (`A A A B B B OFF`) selected automatically from `shiftsPerDay`
- Surplus G-shift distribution — checks only A/B for 2-shift units (never produces C)
- Leave application: natural rest days keep "OFF"; working days become "L" — `absentByDate` map records the vacated shift for each leave day
- Absence coverage: relief → 12-hr pair → TIGHT/INFEASIBLE flag — C-shift shortfalls never arise for 2-shift units
- Detailed coverage messages: "David Khan (B) on leave — D12: Carol Das, N12: Frank Nair"
- INFO-level flags returned when absences were fully covered (not null)
- Rest-hour constraint enforcement (e.g. no A after C)
- Manpower stats (BALANCED / SHORT / SURPLUS)
- Cumulative 12-hr fairness across `cumulative12hrCount`
- Tallies (hours, off days, 12-hr count, nights per employee)

### Shift codes
- `ShiftCode` type includes `"L"` (leave day, pink badge)
- `FeasibilityLevel` type includes `"INFO"` (blue, collapsible in UI)
- `AbsentEntry` interface: `{ empId, name?, originalShift }` — passed per-day into `coverAbsences`

### Database (`prisma/`) ✅
- Schema: `Unit`, `Employee`, `LeaveRequest`, `ScheduleEntry`, `FeasibilityFlag`, `FinalizedSchedule`
- `Employee` table has `cumulativeOffDays Int @default(0)` and `cumulative12hrCount`
- Both fields are **written back** after every generate call (was a known gap — now fixed)
- `FinalizedSchedule` stores a full JSON snapshot (employees, cells, flags, tallies) per finalization
- Migrations applied
- Seed script at `prisma/seed.ts` — creates 12 refinery units (HCU, H2U, CDU, VDU, MSP, DCU, OM&S, ASPU, DHDT, SRB, SDU, WHFU) with Indian-name employee rosters and leave requests

### API routes (`app/api/`) ✅
Full REST surface (19 route files):
- Units CRUD
- Employees CRUD (auto-assigns `seniorityIndex`)
- Leave requests CRUD (with date-range filter)
- Schedule GET `?start=&end=` (returns entries + flags + computed tallies)
- Schedule POST `/generate` `{start, end}` — runs engine, bulk-saves results, persists tallies to Employee table
- Schedule PUT `/[entryId]` (manual override)
- Schedule GET `/export` (`.xlsx` download)
- Reports GET `?start=&end=` — returns leave and 12-hr duty summary per employee
- Finalized GET — list all finalized schedules for a unit (metadata only)
- Finalized POST `{start, end, label?}` — snapshot current schedule entries + flags + tallies
- Finalized/[id] GET — full snapshot JSON
- Finalized/[id] DELETE — remove record
- **AI: Leave Impact** POST `{employeeId, startDate, endDate}` → risk assessment (Low/Medium/High)
- **AI: Schedule Query** POST `{question, context}` → streaming plain-text answer
- **AI: Fairness Audit** POST `{start, end}` → fairness analysis text
- **AI: Schedule Summary** POST `{start, end}` → auto-generated label string
- **AI: Anomaly Detection** POST → historical pattern analysis (needs ≥2 finalized schedules)
- **Debug** GET `/api/debug-ai` → verifies Groq key + model with a live test call

### AI features (`lib/ai.ts` — Groq, LLaMA models) ✅
Five AI features for refinery shift management — core scheduling logic untouched.

**Backend:** `lib/ai.ts` is a fetch-based shim targeting `https://api.groq.com/openai/v1`.
Exposes the same `genAI.getGenerativeModel / generateContent / generateContentStream`
interface previously used by `@google/generative-ai`, so no route files needed changing.
No `globalThis` caching — reads `GROQ_API_KEY` from env fresh on every module load.

| # | Feature | Where in UI | Model |
|---|---|---|---|
| 1 | **Leave Impact Analysis** | Leaves → Add Leave form | llama-3.3-70b-versatile |
| 2 | **Schedule Query (chat)** | Schedule → below grid | llama-3.3-70b-versatile (streaming) |
| 3 | **Fairness Audit** | Schedule → "✦ AI Audit" button | llama-3.3-70b-versatile |
| 4 | **Auto-label generator** | Schedule → Finalize modal | llama-3.1-8b-instant |
| 5 | **Anomaly Detection** | Reports → "AI Pattern Insights" | llama-3.3-70b-versatile |

Requires `GROQ_API_KEY` in `.env` (free key from console.groq.com — no credit card).
All routes return 503 gracefully when key is absent.
All routes have try/catch — return JSON `{error: "..."}` instead of crashing with 500 HTML.

**Schedule Query context format** (fixed in session 4):
Previously formatted as employee rows with unlabelled date columns — AI couldn't map
positions to dates. Now formatted as date-indexed daily assignments:
```
2026-06-06 (Sat): A: Alice Sen | B: Carol Das, David Khan | C: Eve Rao | OFF: Frank Nair
```
This allows the AI to directly answer "who is on B shift on date X".

All AI prompts use "refinery" context (not "hospital").

### UI (`app/`) ✅
22 TypeScript files across 8 pages, all fully working:

- **Dashboard** (`/`): unit cards with BALANCED/SHORT/SURPLUS badge; today's working/leave/12hr counts per unit with stacked shift bar; global summary cards. Date query uses UTC midnight to match stored dates (IST timezone-safe).
- **Schedule grid** (`/units/[unitId]/schedule`):
  - SSR — initial data passed as props, grid in first HTML (no loading flash)
  - **User-defined date range** via start/end date pickers (future months accessible)
  - "L" badge (pink) for leave days; "OFF" only when rotation naturally falls on rest day
  - Feasibility alerts: red (INFEASIBLE), yellow (TIGHT), blue collapsible panel (INFO)
  - Date column headers tinted red/yellow/blue per flag level
  - Tally columns: Hrs / Off / 12hr / Nts per employee
  - Click any cell → override modal; overridden cells get violet ring
  - **"✦ AI Audit"** button (purple) — opens fairness audit modal
  - **Finalize Schedule** button (green) — modal with optional label + "✦ AI auto-label" link
  - **Finalized Schedules table** — lists saved records with View / Delete
  - **"✦ Ask AI"** chat panel — type any question about the current schedule; streams response
  - Export Excel button
- **Employees tab** (`/units/[unitId]/employees`): add/edit/delete, shows Off Days column
- **Leaves tab** (`/units/[unitId]/leaves`):
  - Add/delete with PLANNED/EMERGENCY type
  - **"✦ AI Coverage Impact"** panel — fill employee + dates in the form to get a risk badge (🟢/🟡/🔴) + plain-English analysis before saving
- **Settings tab** (`/units/[unitId]/settings`): edit unit config + danger-zone delete
- **New Unit** (`/units/new`): create form
- **Reports tab** (`/units/[unitId]/reports`):
  - User-defined date range pickers
  - Leave Summary table — pink date badges per employee, total column
  - 12-Hour Duty Summary table — orange D12 dates, red N12 dates, D12/N12/Total columns
  - Totals row in each table footer
  - **"✦ AI Pattern Insights"** section — "Analyse Historical Patterns" button; requires ≥2 finalized schedules
- **Finalized view** (`/units/[unitId]/finalized/[id]`):
  - Read-only snapshot grid — identical layout to live schedule
  - Green "Finalized" badge, finalized-on timestamp
  - Feasibility flags from the snapshot (INFO/TIGHT/INFEASIBLE)
  - "Back to Schedule" link

---

## Known issues / watch-outs

### GROQ_API_KEY must be set for AI features
Add `GROQ_API_KEY="gsk_..."` to `.env`. Free key from console.groq.com → API Keys —
no credit card needed. All AI routes return HTTP 503 with a clear message if the key is
missing — the rest of the app continues to work normally.
Verify with: `GET http://localhost:3000/api/debug-ai`

### DATABASE_URL must be absolute on Windows
`file:./prisma/dev.db` fails silently with `SQLITE_CANTOPEN` in the Prisma JS client
on Windows. The `.env` must use a full absolute path:
```
DATABASE_URL="file:E:/ShiftSchedule/prisma/dev.db"
```
See `.env.example`. If you move the repo, update `.env` accordingly.

### Must restart dev server after changing .env
Next.js reads `.env` only at startup. Changing `GROQ_API_KEY` without restarting
the server means the old key (or empty string) is still in `process.env`.
`lib/ai.ts` has no globalThis cache, so a restart always picks up the latest key.

### Authentication (plain-text passwords — intentional)
Cookie-based session auth is implemented. Passwords are stored as plain text — this is by design (user requirement). Login: `admin / admin123` (all units). Per-unit users: `hcu / password`, `cdu / password`, etc.

### Manual override survives regeneration
When "Generate Schedule" is clicked, the engine is given existing manual overrides
as `existingCells` and re-applies them. Override cells are stored with
`isManualOverride = true` in the DB. They are **not** wiped by regeneration.

### INFO flags only appear after regeneration
Coverage notes (INFO flags) are computed during schedule generation and stored in
`FeasibilityFlag`. Viewing an old schedule generated before this feature was added
will not show blue notes — regenerate to get them.

### Finalized snapshots are immutable point-in-time copies
Regenerating or manually overriding the live schedule does not affect existing
finalized records. A new "Finalize" is needed after any change to capture the update.

### Anomaly Detection needs ≥2 finalized schedules
The AI pattern analysis route returns HTTP 400 with a clear message if fewer than
2 finalized schedules exist for the unit.

---

## What is NOT built yet

- [ ] Multi-month schedule view / calendar
- [ ] Competency-level constraints (field exists in DB, engine ignores it)
- [ ] 12-hr fairness window (`twelveHrFairnessWindow` stored but not used by engine)
- [ ] Shift time overrides per unit (`shiftTimeOverrides` JSON field stored but not surfaced in UI)
- [ ] Notes per schedule entry (field exists, not editable in UI)
- [ ] Employee seniority reordering in UI (drag-and-drop)
- [ ] Print-friendly / PDF schedule view
- [x] Authentication / multi-user ✅ (done — see session 4)
- [ ] Shift swap request workflow
- [ ] Email / WhatsApp notifications when schedule is published

---

## How to resume

> **Working directory:** `E:\ShiftScheduleApp`
> The old `E:\ShiftSchedule` directory is an incomplete leftover from an earlier session and can be deleted.

```bash
# 1. Clone from GitHub (if starting fresh)
git clone https://github.com/DigantaKrborah/ShiftSchedule E:\ShiftScheduleApp

# 2. Copy and edit .env
cp .env.example .env
# Edit .env:
#   DATABASE_URL="file:E:/ShiftScheduleApp/prisma/dev.db"
#   GROQ_API_KEY="gsk_..."   ← free from console.groq.com → API Keys

# 3. Install dependencies
npm install

# 4. Apply migrations
npx prisma migrate deploy

# 5. Seed test data (12 units, ~112 employees, ~26 leaves, 13 users)
npm run db:seed

# 6. Start dev server
npm run dev
# → http://localhost:3000

# 7. Verify AI is working
# Open http://localhost:3000/api/debug-ai — should return {"result":"OK","aiAvailable":true}
```

### Login credentials
| Username | Password | Access |
|---|---|---|
| `admin` | `admin123` | All 12 units (ADMIN) |
| `hcu` | `password` | HCU only |
| `h2u` / `cdu` / `vdu` / `msp` / `dcu` / `oms` / `aspu` / `dhdt` / `srb` / `sdu` / `whfu` | `password` | respective unit |
