-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "personsPerShift" INTEGER NOT NULL DEFAULT 3,
    "shiftsPerDay" INTEGER NOT NULL DEFAULT 3,
    "weeklyOffDays" INTEGER NOT NULL DEFAULT 1,
    "shiftTimeOverrides" TEXT,
    "minRestHours" INTEGER NOT NULL DEFAULT 8,
    "twelveHrFairnessWindow" TEXT NOT NULL DEFAULT 'CALENDAR_MONTH',
    "maxConsecutiveWorkDays" INTEGER NOT NULL DEFAULT 9,
    "minConsecutiveWorkDays" INTEGER NOT NULL DEFAULT 3,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "seniorityIndex" INTEGER NOT NULL,
    "competencyLevel" INTEGER NOT NULL DEFAULT 1,
    "doesRotatingShift" BOOLEAN NOT NULL DEFAULT true,
    "eligibleGShift" BOOLEAN NOT NULL DEFAULT true,
    "eligibleTwelveHr" BOOLEAN NOT NULL DEFAULT true,
    "givesLeaveBackup" BOOLEAN NOT NULL DEFAULT true,
    "cumulative12hrCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScheduleEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "employeeId" TEXT NOT NULL,
    "shiftCode" TEXT NOT NULL,
    "isManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScheduleEntry_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScheduleEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeasibilityFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'OK',
    "message" TEXT NOT NULL DEFAULT '',
    "suggestion" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FeasibilityFlag_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_unitId_seniorityIndex_key" ON "Employee"("unitId", "seniorityIndex");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleEntry_unitId_date_employeeId_key" ON "ScheduleEntry"("unitId", "date", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "FeasibilityFlag_unitId_date_key" ON "FeasibilityFlag"("unitId", "date");
