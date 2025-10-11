-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SubmissionRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "type" TEXT NOT NULL DEFAULT 'submission'
);
INSERT INTO "new_SubmissionRequest" ("createdAt", "error", "id", "ip", "success", "userAgent") SELECT "createdAt", "error", "id", "ip", "success", "userAgent" FROM "SubmissionRequest";
DROP TABLE "SubmissionRequest";
ALTER TABLE "new_SubmissionRequest" RENAME TO "SubmissionRequest";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
