#!/usr/bin/env bash
# scripts/refresh_data.sh
# Refreshes the local SQLite DB from /data using Prisma.
# Safe to run from cron; includes locking, logging, and DB backups.

set -euo pipefail

# --- Config -------------------------------------------------------------------
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$REPO_DIR/logs"
BACKUP_DIR="$REPO_DIR/backups"
DB_PATH="$REPO_DIR/prisma/dev.db"
LOCK_FILE="$REPO_DIR/.refresh.lock"
NODE_BIN="${NODE_BIN:-node}"   # allow NODE_BIN override via env if needed
NPM_BIN="${NPM_BIN:-npm}"
PRISMA_BIN="$REPO_DIR/node_modules/.bin/prisma"

# Optional: branch to pull before seeding (comment out if not desired)
GIT_PULL="${GIT_PULL:-0}"      # set to 1 to enable `git pull`
GIT_BRANCH="${GIT_BRANCH:-main}"

# Optional: build and PM2 reload after seeding (comment out if not desired)
DO_BUILD="${DO_BUILD:-0}"      # set to 1 to run `npm run build`
PM2_APP_NAME="${PM2_APP_NAME:-}"  # set to non-empty to pm2 reload

# --- Environment bootstrap (nvm-friendly) -------------------------------------
# If you use nvm on the server, uncomment these lines:
# export NVM_DIR="$HOME/.nvm"
# [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
# nvm use --silent 18 >/dev/null 2>&1 || true

# --- Logging & locking ---------------------------------------------------------
mkdir -p "$LOG_DIR" "$BACKUP_DIR"
ts() { date +"%Y-%m-%d %H:%M:%S"; }
LOG_FILE="$LOG_DIR/refresh_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

if [[ -f "$LOCK_FILE" ]]; then
  echo "$(ts) [WARN] Another refresh is running (found $LOCK_FILE). Exiting."
  exit 0
fi
trap 'rm -f "$LOCK_FILE"' EXIT
touch "$LOCK_FILE"

echo "$(ts) [INFO] Starting refresh in $REPO_DIR"

cd "$REPO_DIR"

# --- Optional: get fresh code --------------------------------------------------
if [[ "$GIT_PULL" == "1" ]]; then
  echo "$(ts) [INFO] git fetch & reset to origin/$GIT_BRANCH"
  git fetch --all --quiet
  git checkout "$GIT_BRANCH" --quiet
  git reset --hard "origin/$GIT_BRANCH" --quiet
fi

# --- Ensure dependencies -------------------------------------------------------
echo "$(ts) [INFO] Installing deps (npm ci)…"
$NPM_BIN ci --silent

# --- Backup current DB ---------------------------------------------------------
if [[ -f "$DB_PATH" ]]; then
  BK="$BACKUP_DIR/dev_$(date +%Y%m%d_%H%M%S).db"
  cp -f "$DB_PATH" "$BK"
  echo "$(ts) [INFO] Backed up DB to $BK"
else
  echo "$(ts) [INFO] No existing DB found; skipping backup."
fi

# --- Validate presence of data files ------------------------------------------
missing=0
for f in "data/chiplay_institutions_geo.json" \
         "data/chiplay_papers_with_doi.json" \
         "data/openalex_authorships.jsonl"; do
  if [[ ! -s "$f" ]]; then
    echo "$(ts) [ERROR] Missing or empty file: $f"
    missing=1
  fi
done
if [[ $missing -ne 0 ]]; then
  echo "$(ts) [FATAL] One or more required data files are missing. Aborting."
  exit 1
fi

# --- Migrate schema ------------------------------------------------------------
echo "$(ts) [INFO] Applying Prisma migrations…"
$PRISMA_BIN migrate deploy

# --- Seed database -------------------------------------------------------------
echo "$(ts) [INFO] Seeding database (npm run db:seed)…"
$NPM_BIN run db:seed

# --- Quick sanity counts (requires sqlite3; optional) -------------------------
if command -v sqlite3 >/dev/null 2>&1; then
  echo "$(ts) [INFO] Post-seed counts:"
  sqlite3 "$DB_PATH" "SELECT 'Institutions', COUNT(*) FROM Institution UNION ALL
                      SELECT 'Authors', COUNT(*) FROM Author UNION ALL
                      SELECT 'Papers', COUNT(*) FROM Paper UNION ALL
                      SELECT 'Authorships', COUNT(*) FROM Authorship;" \
    | awk -F'|' '{printf "  %-13s %s\n",$1,$2}'
else
  echo "$(ts) [INFO] sqlite3 not found; skipping summary counts."
fi

# --- Optional build & reload ---------------------------------------------------
if [[ "$DO_BUILD" == "1" ]]; then
  echo "$(ts) [INFO] Building app (npm run build)…"
  $NPM_BIN run build
fi

if [[ -n "$PM2_APP_NAME" ]]; then
  if command -v pm2 >/dev/null 2>&1; then
    echo "$(ts) [INFO] Reloading PM2 app: $PM2_APP_NAME"
    pm2 reload "$PM2_APP_NAME"
  else
    echo "$(ts) [WARN] pm2 not found; skipping reload."
  fi
fi

echo "$(ts) [INFO] Refresh complete. Log: $LOG_FILE"