-- CreateTable
CREATE TABLE "SubmissionRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT,
    "institutionName" TEXT NOT NULL,
    "institutionCountry" TEXT,
    "institutionCountryName" TEXT,
    "institutionCity" TEXT,
    "locationQuery" TEXT,
    "institutionWebsite" TEXT,
    "leadershipApproach" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "resolvedLatitude" REAL,
    "resolvedLongitude" REAL,
    "geocodeStatus" TEXT NOT NULL DEFAULT 'pending',
    "geocodeResponse" JSONB,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "rejectedAt" DATETIME,
    "rejectionReason" TEXT,
    "reviewedAt" DATETIME,
    "submissionIp" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending'
);
INSERT INTO "new_Submission" ("contactEmail", "contactName", "createdAt", "id", "institutionCountry", "institutionName", "institutionWebsite", "latitude", "leadershipApproach", "longitude", "status", "updatedAt") SELECT "contactEmail", "contactName", "createdAt", "id", "institutionCountry", "institutionName", "institutionWebsite", "latitude", "leadershipApproach", "longitude", "status", "updatedAt" FROM "Submission";
DROP TABLE "Submission";
ALTER TABLE "new_Submission" RENAME TO "Submission";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
