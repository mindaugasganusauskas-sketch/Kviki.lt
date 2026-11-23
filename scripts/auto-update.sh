#!/usr/bin/env bash
# Automatinis atnaujinimas: jei GitHub'e yra naujų pakeitimų stebimoje šakoje,
# parsisiunčia juos ir perkrauna svetainę. Paleidžiamas kas 5 min. per cron
# (įdiegia scripts/install-vps.sh). Duomenų bazės migracijos pritaikomos paleidžiant svetainę.
#
# Būsena rašoma į .deploy-status/ ir rodoma adresu https://<domenas>/api/status,
# kad atnaujinimą būtų galima patikrinti be terminalo.
set -euo pipefail

cd "$(dirname "$0")/.."
exec 9>/tmp/kviki-auto-update.lock
flock -n 9 || exit 0 # ankstesnis atnaujinimas dar vyksta

STATUS_DIR=.deploy-status
mkdir -p "$STATUS_DIR"
RETRY_MINUTES=60

now() { date -u '+%Y-%m-%dT%H:%M:%SZ'; }
log() { echo "$(date '+%F %T') $*"; }

# write_status būsena [nepavykusi_versija] [priežastis]
write_status() {
  local version
  version=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)
  printf '{"state":"%s","version":"%s","failedVersion":"%s","reason":"%s","checkedAt":"%s"}\n' \
    "$1" "$version" "${2:-}" "${3:-}" "$(now)" >"$STATUS_DIR/status.json.tmp"
  mv "$STATUS_DIR/status.json.tmp" "$STATUS_DIR/status.json"
}

# Klaidos priežastis pagal surinkimo žurnalą.
classify() {
  local file=$1 code=$2 reason=build_error
  grep -qiE "EAI_AGAIN|ETIMEDOUT|ECONNRESET|ENOTFOUND|TLS handshake timeout|i/o timeout|failed to resolve source metadata|toomanyrequests|failed to fetch" "$file" && reason=network
  grep -qiE "exit code: 137|Killed|out of memory|ENOMEM|JavaScript heap" "$file" && reason=out_of_memory
  grep -qi "no space left on device" "$file" && reason=disk_full
  [ "$code" = 124 ] && reason=timeout
  echo "$reason"
}

# Jei diske mažai vietos, išvalome seną Docker surinkimo talpyklą (kitų svetainių konteinerių neliečia).
free_kb=$(df -Pk /var/lib/docker 2>/dev/null | awk 'NR==2 {print $4}' || true)
if [ -n "${free_kb:-}" ] && [ "$free_kb" -lt 5000000 ]; then
  log "Mažai vietos diske ($((free_kb / 1024)) MB) – valoma Docker surinkimo talpykla"
  docker builder prune -af >/dev/null 2>&1 || true
fi

branch=$(git rev-parse --abbrev-ref HEAD)
if ! git fetch --quiet origin "$branch" 2>"$STATUS_DIR/fetch.log"; then
  log "Nepavyko pasiekti GitHub: $(tail -1 "$STATUS_DIR/fetch.log")"
  write_status fetch_failed "" github
  exit 1
fi
local_rev=$(git rev-parse HEAD)
remote_rev=$(git rev-parse "origin/$branch")
failed_rev=$(cat .auto-update-failed 2>/dev/null || true)

if [ "$local_rev" = "$remote_rev" ]; then
  write_status ok
  exit 0
fi
# Atnaujiname tik tada, kai GitHub'e yra naujesnė tos pačios istorijos versija.
if ! git merge-base --is-ancestor "$local_rev" "$remote_rev"; then
  log "Serverio kopija skiriasi nuo GitHub (vietiniai pakeitimai?) – atnaujinimas praleistas."
  write_status diverged "${remote_rev:0:7}" local_changes
  exit 0
fi
# Nepavykusį surinkimą kartojame ne dažniau kaip kas RETRY_MINUTES min.
if [ "$failed_rev" = "$remote_rev" ] && [ -n "$(find .auto-update-failed -mmin -"$RETRY_MINUTES" 2>/dev/null)" ]; then
  write_status failed "${remote_rev:0:7}" "$(cat "$STATUS_DIR/reason" 2>/dev/null || echo build_error)"
  exit 0
fi

log "Atnaujinama ${branch}: ${local_rev:0:7} -> ${remote_rev:0:7}"
if ! git merge --ff-only --quiet "origin/$branch"; then
  log "Nepavyko atnaujinti: serveryje yra vietinių pakeitimų. Svetainė nepakeista."
  write_status diverged "${remote_rev:0:7}" local_changes
  exit 1
fi
write_status updating "" ""

build_log="$STATUS_DIR/build.log"
set +e
timeout 45m docker compose up -d --build --remove-orphans >"$build_log" 2>&1
code=$?
set -e
if [ "$code" = 0 ]; then
  docker image prune -f >/dev/null 2>&1 || true
  docker builder prune -f --filter until=168h >/dev/null 2>&1 || true
  rm -f .auto-update-failed "$STATUS_DIR/last-error.txt" "$STATUS_DIR/reason"
  write_status ok
  log "Atnaujinta"
else
  reason=$(classify "$build_log" "$code")
  tail -n 30 "$build_log" >"$STATUS_DIR/last-error.txt"
  echo "$reason" >"$STATUS_DIR/reason"
  log "Surinkimas nepavyko ($reason) – grąžinama ankstesnė versija ${local_rev:0:7}. Bus bandoma vėl po ${RETRY_MINUTES} min."
  tail -n 15 "$build_log"
  echo "$remote_rev" >.auto-update-failed
  git reset --hard --quiet "$local_rev"
  timeout 30m docker compose up -d --build --remove-orphans >"$STATUS_DIR/rollback.log" 2>&1 || true
  write_status failed "${remote_rev:0:7}" "$reason"
  exit 1
fi
