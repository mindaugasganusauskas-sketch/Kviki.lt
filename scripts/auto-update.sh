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
  version=$(cat "$STATUS_DIR/built-rev" 2>/dev/null || git rev-parse HEAD 2>/dev/null || echo unknown)
  printf '{"state":"%s","version":"%s","failedVersion":"%s","reason":"%s","checkedAt":"%s"}\n' \
    "$1" "${version:0:7}" "${2:-}" "${3:-}" "$(now)" >"$STATUS_DIR/status.json.tmp"
  mv "$STATUS_DIR/status.json.tmp" "$STATUS_DIR/status.json"
}

# Klaidos priežastis pagal surinkimo žurnalą.
classify() {
  local file=$1 code=$2 reason=build_error
  grep -qiE "EAI_AGAIN|ETIMEDOUT|ECONNRESET|ENOTFOUND|TLS handshake timeout|i/o timeout|failed to resolve source metadata|toomanyrequests|failed to fetch" "$file" && reason=network
  grep -qiE "unhealthy|is not healthy|exited with code" "$file" && reason=app_not_starting
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
prev_rev=$(git rev-parse HEAD)
remote_rev=$(git rev-parse "origin/$branch")
failed_rev=$(cat .auto-update-failed 2>/dev/null || true)
built_rev=$(cat "$STATUS_DIR/built-rev" 2>/dev/null || true)

# Nepavykusį surinkimą kartojame ne dažniau kaip kas RETRY_MINUTES min.
if [ "$failed_rev" = "$remote_rev" ] && [ -n "$(find .auto-update-failed -mmin -"$RETRY_MINUTES" 2>/dev/null)" ]; then
  write_status failed "${remote_rev:0:7}" "$(cat "$STATUS_DIR/reason" 2>/dev/null || echo build_error)"
  exit 0
fi

if [ "$prev_rev" != "$remote_rev" ]; then
  # Atnaujiname tik tada, kai GitHub'e yra naujesnė tos pačios istorijos versija.
  if ! git merge-base --is-ancestor "$prev_rev" "$remote_rev"; then
    log "Serverio kopija skiriasi nuo GitHub (vietiniai pakeitimai?) – atnaujinimas praleistas."
    write_status diverged "${remote_rev:0:7}" local_changes
    exit 0
  fi
  if ! git merge --ff-only --quiet "origin/$branch"; then
    log "Nepavyko atnaujinti: serveryje yra vietinių pakeitimų. Svetainė nepakeista."
    write_status diverged "${remote_rev:0:7}" local_changes
    exit 1
  fi
elif [ "$built_rev" = "$remote_rev" ]; then
  write_status ok
  exit 0
fi

if [ -n "$built_rev" ]; then
  log "Atnaujinama ${branch}: ${built_rev:0:7} -> ${remote_rev:0:7}"
else
  log "Surenkama ${branch} versija ${remote_rev:0:7}"
fi
write_status updating "" ""
build_log="$STATUS_DIR/build.log"
set +e
# --wait: laikoma pavykusiu tik tada, kai nauja svetainė pasileido ir atsako (sveikatos patikra).
timeout 45m docker compose up -d --build --remove-orphans --wait --wait-timeout 300 >"$build_log" 2>&1
code=$?
set -e
if [ "$code" = 0 ]; then
  echo "$remote_rev" >"$STATUS_DIR/built-rev"
  docker image prune -f >/dev/null 2>&1 || true
  docker builder prune -f --filter until=168h >/dev/null 2>&1 || true
  rm -f .auto-update-failed "$STATUS_DIR/last-error.txt" "$STATUS_DIR/reason"
  write_status ok
  log "Atnaujinta"
  exit 0
fi

reason=$(classify "$build_log" "$code")
tail -n 30 "$build_log" >"$STATUS_DIR/last-error.txt"
echo "$reason" >"$STATUS_DIR/reason"
echo "$remote_rev" >.auto-update-failed
log "Surinkimas nepavyko ($reason). Bus bandoma vėl po ${RETRY_MINUTES} min. Paskutinės žurnalo eilutės:"
tail -n 15 "$build_log"
if [ "$prev_rev" != "$remote_rev" ]; then
  log "Grąžinama ankstesnė versija ${prev_rev:0:7}"
  git reset --hard --quiet "$prev_rev"
  timeout 30m docker compose up -d --build --remove-orphans >"$STATUS_DIR/rollback.log" 2>&1 || true
fi
write_status failed "${remote_rev:0:7}" "$reason"
exit 1
