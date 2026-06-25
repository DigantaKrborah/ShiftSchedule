-- CreateTable
CREATE TABLE "FinalizedSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "finalizedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshot" TEXT NOT NULL,
    CONSTRAINT "FinalizedSchedule_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
