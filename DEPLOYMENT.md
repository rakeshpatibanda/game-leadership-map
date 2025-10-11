# Deployment Guide (Vercel + Neon Postgres)

This project currently targets a local SQLite file for development. Hosting the app on Vercel requires moving the database to a managed service (e.g. [Neon](https://neon.tech)) and teaching Prisma to talk to Postgres. Follow the steps below to complete that migration and deploy for free.

---

## 1. Create a Neon Database (Free Tier)

1. Sign up at [neon.tech](https://neon.tech) and create a new project.
2. Copy the **Postgres connection string** that Neon gives you (something like `postgresql://user:password@host/dbname`).

---

## 2. Point Prisma to Postgres

1. Open `prisma/schema.prisma` and change the datasource provider:

   ```diff
   datasource db {
-  provider = "sqlite"
-  url      = env("DATABASE_URL")
+  provider = "postgresql"
+  url      = env("DATABASE_URL")
   }
   ```

   > SQLite-specific types (e.g. `Json` columns using `JSONB`) already line up with Postgres, so no further schema edits are required.

2. In your local `.env`, replace or add the Neon connection string:

   ```dotenv
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
   ```

   Keep other variables (`USER_AGENT`, rate-limit knobs, etc.) untouched.

---

## 3. Regenerate Prisma Client & Migrate

Install dependencies if you haven’t already:

```bash
npm install
```

Push the existing migrations into the remote Postgres database:

```bash
npx prisma migrate deploy
```

Seed the database so the map has data:

```bash
npm run db:seed
```

> You can verify the data with `npx prisma studio` – it will connect to Neon because `DATABASE_URL` now points there.

---

## 4. Commit the Changes

1. Make sure `prisma/dev.db` and other SQLite artefacts are removed (or `.gitignored`).
2. Commit the schema change and any updated docs:

   ```bash
   git add prisma/schema.prisma DEPLOYMENT.md README.md
   git commit -m "Point Prisma to Postgres and add deployment guide"
   git push
   ```

---

## 5. Deploy on Vercel (Free Hobby Plan)

1. Sign in at [vercel.com](https://vercel.com) and **Import Project** → GitHub repo.
2. Default settings are fine:
   - Build command: `npm run build`
   - Output dir: `.next`
3. In **Project → Settings → Environment Variables**, add:
   - `DATABASE_URL` (Neon connection string)
   - Existing variables (`USER_AGENT`, `NOMINATIM_URL`, `SUBMISSION_RATE_LIMIT_*`, `ADMIN_USER`, `ADMIN_PASS`, etc.)
4. Trigger the first deploy (Vercel does this automatically after import).

Once the deploy finishes:

- Visit the generated `*.vercel.app` URL to confirm the map loads.
- Hit `/admin/submissions` to verify the moderation UI (basic auth uses `ADMIN_USER`/`ADMIN_PASS`).

---

## 6. Future Workflow

- Any push to the default branch redeploys automatically.
- To refresh data, run `npm run db:seed` locally (it targets Neon via the same `DATABASE_URL`). You can also script this via GitHub Actions or Vercel Cron if desired.

---

## Optional: Different Environments

If you want separate dev/prod databases:

1. Keep the Neon URL in `.env.production`.
2. Maintain a local SQLite `.env.development` and run Prisma with a different schema file (e.g. `prisma/schema.sqlite.prisma`) or switch the `DATABASE_URL` before running `npm run dev`.

For simplicity, this guide standardises on Neon for all environments so the schema and migrations remain consistent.

---

That’s it—you now have a fully-managed Postgres database and clear steps to deploy the Next.js app on Vercel’s free tier. If you adopt a different provider (Supabase, Railway, Turso, etc.) the process is nearly identical: swap the connection string and keep the Prisma provider set to `postgresql`.
