-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Employee" (
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
    "cumulativeOffDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Employee" ("competencyLevel", "createdAt", "cumulative12hrCount", "doesRotatingShift", "eligibleGShift", "eligibleTwelveHr", "givesLeaveBackup", "id", "name", "seniorityIndex", "unitId", "updatedAt") SELECT "competencyLevel", "createdAt", "cumulative12hrCount", "doesRotatingShift", "eligibleGShift", "eligibleTwelveHr", "givesLeaveBackup", "id", "name", "seniorityIndex", "unitId", "updatedAt" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE UNIQUE INDEX "Employee_unitId_seniorityIndex_key" ON "Employee"("unitId", "seniorityIndex");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
