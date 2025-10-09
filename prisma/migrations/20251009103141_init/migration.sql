-- CreateTable
CREATE TABLE "Paper" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dblpKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER,
    "venue" TEXT,
    "doi" TEXT,
    "openalexId" TEXT
);

-- CreateTable
CREATE TABLE "Author" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "openalexId" TEXT
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "country" TEXT,
    "lat" REAL,
    "lng" REAL,
    "type" TEXT
);

-- CreateTable
CREATE TABLE "Authorship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order" INTEGER,
    "paperId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    CONSTRAINT "Authorship_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Authorship_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Authorship_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Paper_dblpKey_key" ON "Paper"("dblpKey");

-- CreateIndex
CREATE UNIQUE INDEX "Paper_doi_key" ON "Paper"("doi");

-- CreateIndex
CREATE UNIQUE INDEX "Paper_openalexId_key" ON "Paper"("openalexId");

-- CreateIndex
CREATE UNIQUE INDEX "Author_openalexId_key" ON "Author"("openalexId");

-- CreateIndex
CREATE UNIQUE INDEX "authorship_unique" ON "Authorship"("paperId", "authorId", "institutionId");
