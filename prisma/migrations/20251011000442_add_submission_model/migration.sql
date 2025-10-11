-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT,
    "institutionName" TEXT NOT NULL,
    "institutionCountry" TEXT,
    "institutionWebsite" TEXT,
    "leadershipApproach" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "status" TEXT NOT NULL DEFAULT 'pending'
);
