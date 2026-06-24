/**
 * Seed script — creates two units with employees and leave requests.
 * Run: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const UNITS = [
  {
    name: "ICU North",
    personsPerShift: 3,
    shiftsPerDay: 3,
    weeklyOffDays: 1,
    minRestHours: 8,
    maxConsecutiveWorkDays: 9,
    minConsecutiveWorkDays: 3,
    employees: [
      { name: "Alice Sen",     doesRotatingShift: false, eligibleGShift: true,  eligibleTwelveHr: false, givesLeaveBackup: true  },
      { name: "Bob Roy",       doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Carol Das",     doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "David Khan",    doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Eva Bose",      doesRotatingShift: true,  eligibleGShift: false, eligibleTwelveHr: true,  givesLeaveBackup: false },
      { name: "Frank Nair",    doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Grace Iyer",    doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Harry Raj",     doesRotatingShift: true,  eligibleGShift: false, eligibleTwelveHr: true,  givesLeaveBackup: false },
      { name: "Irene Patel",   doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Jasmin Singh",  doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: false, givesLeaveBackup: true  },
      { name: "Kevin Thomas",  doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
    ],
    leaves: [
      { employeeIndex: 3, startDate: isoDate(2026, 7, 7),  endDate: isoDate(2026, 7, 11), reason: "Annual leave",   status: "PLANNED"   },
      { employeeIndex: 6, startDate: isoDate(2026, 7, 14), endDate: isoDate(2026, 7, 18), reason: "Annual leave",   status: "PLANNED"   },
      { employeeIndex: 1, startDate: isoDate(2026, 7, 21), endDate: isoDate(2026, 7, 21), reason: "Medical",        status: "EMERGENCY" },
      { employeeIndex: 8, startDate: isoDate(2026, 8, 4),  endDate: isoDate(2026, 8, 8),  reason: "Family event",  status: "PLANNED"   },
    ],
  },
  {
    name: "Emergency Dept",
    personsPerShift: 2,
    shiftsPerDay: 3,
    weeklyOffDays: 1,
    minRestHours: 10,
    maxConsecutiveWorkDays: 7,
    minConsecutiveWorkDays: 2,
    employees: [
      { name: "Lena Mehta",    doesRotatingShift: false, eligibleGShift: true,  eligibleTwelveHr: false, givesLeaveBackup: true  },
      { name: "Mark D'Souza",  doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Nina Verma",    doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Oscar Rao",     doesRotatingShift: true,  eligibleGShift: false, eligibleTwelveHr: true,  givesLeaveBackup: false },
      { name: "Priya Joshi",   doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Qadir Ali",     doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: true,  givesLeaveBackup: true  },
      { name: "Ritu Sharma",   doesRotatingShift: true,  eligibleGShift: true,  eligibleTwelveHr: false, givesLeaveBackup: true  },
      { name: "Suresh Pillai", doesRotatingShift: true,  eligibleGShift: false, eligibleTwelveHr: true,  givesLeaveBackup: false },
    ],
    leaves: [
      { employeeIndex: 2, startDate: isoDate(2026, 7, 3),  endDate: isoDate(2026, 7, 5),  reason: "Medical",       status: "EMERGENCY" },
      { employeeIndex: 5, startDate: isoDate(2026, 7, 21), endDate: isoDate(2026, 7, 25), reason: "Annual leave",  status: "PLANNED"   },
    ],
  },
] as const;

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding database…");

  // Wipe existing data in dependency order
  await prisma.feasibilityFlag.deleteMany();
  await prisma.scheduleEntry.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.unit.deleteMany();

  for (const unitDef of UNITS) {
    const { employees: empDefs, leaves: leaveDefs, ...unitFields } = unitDef;

    const unit = await prisma.unit.create({ data: unitFields });
    console.log(`  Created unit: ${unit.name}`);

    // Create employees with seniority = insertion order (0 = most senior)
    const employees = await Promise.all(
      empDefs.map((emp, idx) =>
        prisma.employee.create({
          data: {
            unitId: unit.id,
            seniorityIndex: idx,
            name: emp.name,
            doesRotatingShift: emp.doesRotatingShift,
            eligibleGShift: emp.eligibleGShift,
            eligibleTwelveHr: emp.eligibleTwelveHr,
            givesLeaveBackup: emp.givesLeaveBackup,
          },
        })
      )
    );
    console.log(`    ${employees.length} employees`);

    // Create leave requests
    for (const lv of leaveDefs) {
      const emp = employees[lv.employeeIndex];
      await prisma.leaveRequest.create({
        data: {
          employeeId: emp.id,
          startDate: new Date(lv.startDate),
          endDate: new Date(lv.endDate),
          reason: lv.reason,
          status: lv.status,
        },
      });
    }
    console.log(`    ${leaveDefs.length} leave requests`);
  }

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
