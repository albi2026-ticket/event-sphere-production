#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${BACKEND_DIR:-${ROOT_DIR}/backend}"
HEALTH_URL="${HEALTH_URL:-}"
PHP_FPM_SERVICE="${PHP_FPM_SERVICE:-}"
MODE="dry-run"

usage() {
  cat <<'USAGE'
Usage: ./deploy.sh [--execute]

Default mode is dry-run. Pass --execute to run deployment commands.

Environment overrides:
  BACKEND_DIR       Laravel backend directory. Defaults to ./backend.
  HEALTH_URL        Optional health check URL, for example https://api.example.com/up.
  PHP_FPM_SERVICE   Optional service to reload, for example php8.3-fpm.
  SKIP_BUILD        Set to 1 to skip npm ci and npm run build.
  SKIP_MIGRATIONS   Set to 1 to skip php artisan migrate --force.
USAGE
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ "${1:-}" == "--execute" ]]; then
  MODE="execute"
elif [[ $# -gt 0 ]]; then
  usage
  exit 2
fi

run() {
  if [[ "$MODE" == "dry-run" ]]; then
    printf '[dry-run] %s\n' "$*"
  else
    printf '[run] %s\n' "$*"
    "$@"
  fi
}

run_in() {
  local dir="$1"
  shift

  if [[ "$MODE" == "dry-run" ]]; then
    printf '[dry-run] (cd %s && %s)\n' "$dir" "$*"
  else
    printf '[run] (cd %s && %s)\n' "$dir" "$*"
    (cd "$dir" && "$@")
  fi
}

echo "Tiketa production deploy (${MODE})"
echo "Root: ${ROOT_DIR}"
echo "Backend: ${BACKEND_DIR}"

if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  run_in "$ROOT_DIR" npm ci
  run_in "$ROOT_DIR" npm run build
fi

run_in "$BACKEND_DIR" composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader
run_in "$BACKEND_DIR" composer deploy:preflight

if [[ "${SKIP_MIGRATIONS:-0}" != "1" ]]; then
  run_in "$BACKEND_DIR" php artisan migrate --force
fi

run_in "$BACKEND_DIR" composer deploy:optimize

if [[ -n "$PHP_FPM_SERVICE" ]]; then
  run sudo systemctl reload "$PHP_FPM_SERVICE"
else
  echo "[info] PHP_FPM_SERVICE not set; reload PHP-FPM through your process manager if OPcache timestamp validation is disabled."
fi

if [[ -n "$HEALTH_URL" ]]; then
  run curl --fail --silent --show-error --max-time 10 "$HEALTH_URL"
else
  echo "[info] HEALTH_URL not set; run a production /up health check before taking traffic."
fi

echo "Deploy script completed (${MODE})."
