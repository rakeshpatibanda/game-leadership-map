-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT,
    "submitterType" TEXT,
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
    "status" TEXT NOT NULL DEFAULT 'pending',
    "institutionId" TEXT,
    "duplicateOfId" TEXT,
    CONSTRAINT "Submission_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Submission_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "Institution" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Submission" ("approvedAt", "approvedBy", "contactEmail", "contactName", "createdAt", "geocodeResponse", "geocodeStatus", "id", "institutionCity", "institutionCountry", "institutionCountryName", "institutionName", "institutionWebsite", "latitude", "leadershipApproach", "locationQuery", "longitude", "rejectedAt", "rejectionReason", "resolvedLatitude", "resolvedLongitude", "reviewedAt", "status", "submissionIp", "updatedAt") SELECT "approvedAt", "approvedBy", "contactEmail", "contactName", "createdAt", "geocodeResponse", "geocodeStatus", "id", "institutionCity", "institutionCountry", "institutionCountryName", "institutionName", "institutionWebsite", "latitude", "leadershipApproach", "locationQuery", "longitude", "rejectedAt", "rejectionReason", "resolvedLatitude", "resolvedLongitude", "reviewedAt", "status", "submissionIp", "updatedAt" FROM "Submission";
DROP TABLE "Submission";
ALTER TABLE "new_Submission" RENAME TO "Submission";
CREATE INDEX "Submission_institutionId_idx" ON "Submission"("institutionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
