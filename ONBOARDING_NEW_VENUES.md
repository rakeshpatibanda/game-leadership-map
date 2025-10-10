# Game Leadership Map — Onboarding New Venues (CHI, TEI, DIS, TOCHI)

This guide explains how to create a new site or extend the existing site using this GitHub repository, with fresh data from conferences and journals such as CHI, TEI, DIS, and TOCHI.

It assumes:

- You are using this repo’s Next.js + Prisma + SQLite stack.
- Data files live in `/data` and populate the DB via `npm run db:seed`.
- The map reads from `/api/markers`.

If you only want a quick local refresh from already-prepared files, see “Fast path” below.

---

## Contents

- Fast path (existing data files)
- Set up the project
- Plan your scope
- Build the data files
  - 4.1 Collect papers from DBLP
  - 4.2 Ensure DOIs
  - 4.3 Create authorship links (OpenAlex)
  - 4.4 Create institutions with geo
  - 4.5 Validate files
- Seed and run
- Add venue filters (optional but recommended)
- Automate refreshes (optional)
- Troubleshooting
- Checklists
- Appendix: File schemas and naming

---

## Fast path (existing data files)

If you already have correctly formatted files in `/data`:

```
data/
├── chiplay_institutions_geo.json
├── chiplay_papers_with_doi.json
└── openalex_authorships.jsonl
```

Run:

```bash
npm install
npm run lint   # optional: surfaces TypeScript or ESLint issues before seeding
npx prisma migrate deploy
npm run db:seed
npm run dev
```

You’re done. The site will reflect the data.

Quick verification steps after the fast path:

- Visit <http://localhost:3000> and zoom to a region where you expect updates.
- Open the browser console to ensure `/api/markers` responds without errors.
- Optionally run `npx prisma studio` and confirm the `Paper` and `Institution` counts match your expectations.

---

## Set up the project

Clone the repo.

```bash
git clone <your-repo-url>
cd game-leadership-map
```

Install dependencies.

```bash
npm install
```

Configure the database.

Create `.env` (if missing):

```bash
echo 'DATABASE_URL="file:./prisma/dev.db"' > .env
```

Apply the schema.

```bash
npx prisma migrate deploy
```

Optional environment sanity checks:

- Ensure you are running Node.js v18 or newer (`node -v`).
- If you use `nvm`, run `nvm use` so global installs (like `sqlite3`) are available to the script.
- Confirm `sqlite3` is installed if you want the refresh script to print record counts.

---

## Plan your scope

Decide:

- Which venues (e.g., CHI, TEI, DIS, TOCHI).
- Which years (e.g., last 5 years).
- Whether you will:
  - Replace existing data (new site).
  - Merge new venues into current data (extend existing site).

Tip:

- You can keep one combined dataset (all venues in one set of files).
- Or keep per-venue files and merge them before seeding.

---

## Build the data files

You need three inputs in `/data`:

- `*_papers_with_doi.json` — all target papers with DOIs and venue tags.
- `openalex_authorships.jsonl` — author–paper–institution links.
- `*_institutions_geo.json` — institution IDs (prefer ROR), country, lat, lng.

You can name them per venue, then merge to a single set before seeding (see Appendix).

### 4.1 Collect papers from DBLP

Goal: extract title, year, venue, DOI (if present), dblpKey, and provisional authors.

Steps:

- Identify the DBLP series page (e.g., `https://dblp.org/db/conf/chi/`).
- Use the DBLP API or XML export (the `format` parameter) to download entries.
- Map fields:
  - `dblpKey` (unique per paper).
  - `title`.
  - `year`.
  - `venue` (string you want to show).
  - `doi` (if present in DBLP; if not, you’ll add later).
  - `authors` (names list for provisional linking).
- Save to `/_papers_with_doi.json` (temporary, refine in later steps).
- Keep a column for `source` (e.g., `"CHI 2025 Proceedings"`) if you intend to add filter UI later.
- Document any manual corrections in a changelog (e.g., `docs/data-notes.md`) so the team remembers why titles or venues were adjusted.

### 4.2 Ensure DOIs

- DOIs are crucial to link with OpenAlex.
- If DBLP entries lack DOIs:
  - Use the ACM Digital Library or IEEE Xplore for the venue; copy the DOI.
  - Sometimes DBLP’s `ee` field has the DOI URL.
  - As fallback, use Crossref search by title + year.
- Add the DOI string (`10.xxxx/...`) to each paper.
- If no DOI exists, leave null: the system will seed but some automation will skip linking.

### 4.3 Create authorship links (OpenAlex)

Goal: map each paper to authors and institutions.

- Use OpenAlex Works API with the DOI.
  - Endpoint: `https://api.openalex.org/works/https://doi.org/<DOI>` or `https://api.openalex.org/works/<OpenAlexID>`.
- Extract:
  - `authorships`: list of authors with `author.id`, `author.display_name`, `institutions`.
  - For each institution:
    - `institution.id` (OpenAlex format `https://openalex.org/I123...`).
    - `display_name`.
    - `ror` (if present).
- Create JSONL lines: `{ "author": "Name", "paper_doi": "...", "institution_id": "inst:ror:...", "order": 1 }`.
  - `order` is the author position.
  - `institution_id`: prefer `inst:ror:<ROR_ID>`. If missing, fall back to `inst:name:<slug>`.
- Save these lines to `openalex_authorships.jsonl`.

Rate limit tips:

- Respect OpenAlex’s rate limits (1 request/sec recommended).
- Cache responses locally to avoid repeated queries.
- An alternative: download the venue’s dataset via OpenAlex filters.
- When a DOI returns multiple institutions, include them all; MapLibre clusters handle duplicates gracefully and users benefit from complete affiliation data.
- If an author has no listed institution, create a sentinel entry like `inst:name:independent-researcher` and add a note in the appendix.

### 4.4 Create institutions with geo

Goal: ensure every institution has geolocation.

- Use ROR API if you have `ror` IDs.
  - `https://api.ror.org/organizations/<ROR_ID>`.
  - Get `name`, `country.country_code`, `locations[0].lat/long`.
- If no ROR:
  - Geocode the name + city with OpenStreetMap or Google Maps.
  - Create IDs `inst:name:<slug>`.
- Build `*_institutions_geo.json`:

```json
[
  {
    "id": "inst:ror:01aff2v68",
    "name": "University of Waterloo",
    "country": "CA",
    "lat": 43.4668,
    "lng": -80.51639,
    "type": "University"
  }
]
```

Ensure IDs match those in `openalex_authorships.jsonl`.
- If a single institution spans multiple campuses, pick the HQ coordinates or create separate IDs (e.g., `inst:ror:abc123-campus-1`) and document the convention so future updates remain consistent.
- Consider adding a `type` field (`"University"`, `"Company"`, `"Nonprofit"`) to support UI legends later.

### 4.5 Validate files

- Use `jq` or JSON validators to ensure correct syntax.
- Ensure each paper’s DOI appears in the authorship JSONL.
- Ensure each institution ID is defined in `institutions_geo`.
- Optional: run `npm run db:seed` to catch issues early.

---

## Seed and run

Once the three files are ready (merged or per venue but canonical filenames):

```bash
npm run db:seed
npm run dev
```

Visit <http://localhost:3000> to verify markers and filters.

---

## Add venue filters (optional but recommended)

If you combine multiple venues, consider adding a venue filter to the UI.

Backend (`src/app/api/markers/route.ts`):

- Add a query param for `venue` (or `venues`).
- Filter the SQL (`WHERE venue IN (...)`).
- Return the venue in the JSON payload.

UI (`src/app/page.tsx`):

- Add a multi-select or tag-style filter for venues.
- Pass the selected venues to `/api/markers?venues=....`
- Update the map when filters change.

Keep it simple first. Name normalisation helps (e.g., “CHI 2025” → “CHI”).

---

## Automate refreshes (optional)

You already have the script:

```
scripts/refresh_data.sh
```

Run by hand:

```bash
npm run refresh
```

Or schedule with cron on a server:

```cron
30 2 * * * /bin/bash /ABSOLUTE/PATH/TO/scripts/refresh_data.sh >> /ABSOLUTE/PATH/TO/logs/cron.log 2>&1
```

Flags:

- `GIT_PULL=1` to fetch latest code first.
- `DO_BUILD=1` to rebuild after seeding.
- `PM2_APP_NAME="<name>"` to reload a PM2 process.
- `PRISMA_BIN` or `NPM_BIN` can be set if your runtime uses non-default binary paths (e.g., systemd units).
- Always test the script manually (`npm run refresh`) before introducing cron to avoid silent failures.

---

## Troubleshooting

**Map shows fewer institutions than expected**  
Missing lat/lng → add coordinates to institutions JSON.

**Seeding fails with unique constraint**  
Check that the seed uses upserts. Fix duplicates in the input files.

**OpenAlex lookups are slow**  
Cache responses. Respect rate limits. Start with DOI-only fast path.

**Papers missing DOIs**  
They will seed. Links to authors and institutions may be incomplete.

**Authorship order invalid**  
Must be a number. Not a string.

**JSON/JSONL parse errors**  
Validate with `jq` and fix the syntax.

**Markers display in the wrong ocean**  
Double-check that latitude is between -90 and 90, longitude between -180 and 180, and that you didn’t accidentally swap them.

**New venue not appearing in filters**  
Ensure your UI code reads unique venue names from the seeded data and that names are normalised (e.g., `"CHI"` vs `"CHI 2025"`). Consider adding a `shortVenue` field during preprocessing.

---

## Checklists

### Before seeding

- Papers JSON contains dblpKey, title, year, venue, doi (if known).
- Authorships JSONL lines have paper_doi, author, institution_id, order (int).
- Institutions JSON has id, name, country, lat, lng.
- File formats validate with `jq`.

### After seeding

- Prisma Studio shows expected counts.
- Map shows expected coverage.
- Popups show sensible top authors.
- Logs in `logs/` contain the timestamped run and show zero errors.

---

## Appendix: File schemas and naming

Papers JSON (merged across venues if you like):

```json
[
  {
    "dblpKey": "conf/chi/Smith2025",
    "title": "Paper title",
    "year": 2025,
    "venue": "CHI 2025",
    "doi": "10.xxxx/xxxxx",
    "openalexId": "W123...",
    "authorships": [
      { "author_name": "Jane Smith", "institution_id": "inst:ror:01aff2v68", "author_order": 1 }
    ]
  }
]
```

Authorships JSONL:

```json
{"author": "Jane Smith", "paper_doi": "10.xxxx/xxxxx", "institution_id": "inst:ror:01aff2v68", "order": 1}
```

Institutions JSON:

```json
[
  { "id": "inst:ror:01aff2v68", "name": "University of Waterloo", "country": "CA", "lat": 43.4668, "lng": -80.51639 }
]
```

Naming:

- You may gather per venue: `chi_papers_with_doi.json`, `tei_papers_with_doi.json`, etc.
- Merge into the three canonical filenames the seed expects.
- Or update your seed to read multiple files if you prefer.
- If you support multiple venues, maintain a `venues.json` metadata file that lists venue names, acronyms, and colour codes so teammates know which abbreviations to use.

---

## Final notes

- Use DBLP series pages and their XML links to extract structured entries.
- Prefer DOIs for robust joins.
- Prefer ROR for institution IDs.
- Keep the process repeatable. Update `/data`, then run `npm run refresh`.
- Share your data pipeline steps in a team wiki so new contributors can reproduce them without guessing.
- When onboarding entirely new venues, coordinate with stakeholders to verify licensing or citation requirements (some venues require specific acknowledgements on visualisations).
