#!/usr/bin/env bash
# Automatinis atnaujinimas: jei GitHub'e yra naujų pakeitimų stebimoje šakoje,
# parsisiunčia juos ir perkrauna svetainę. Paleidžiamas kas 5 min. per cron
# (įdiegia scripts/install-vps.sh). Duomenų bazės migracijos pritaikomos paleidžiant svetainę.
set -euo pipefail

cd "$(dirname "$0")/.."
exec 9>/tmp/kviki-auto-update.lock
flock -n 9 || exit 0 # ankstesnis atnaujinimas dar vyksta

branch=$(git rev-parse --abbrev-ref HEAD)
git fetch --quiet origin "$branch"
local_rev=$(git rev-parse HEAD)
remote_rev=$(git rev-parse "origin/$branch")
[ "$local_rev" = "$remote_rev" ] && exit 0
# Nekartojame nepavykusio surinkimo kas 5 min. – laukiame naujesnio pakeitimo.
[ "$(cat .auto-update-failed 2>/dev/null || true)" = "$remote_rev" ] && exit 0

echo "$(date '+%F %T') Atnaujinama ${branch}: ${local_rev:0:7} -> ${remote_rev:0:7}"
if ! git merge --ff-only --quiet "origin/$branch"; then
  echo "$(date '+%F %T') Nepavyko atnaujinti: serveryje yra vietinių pakeitimų. Svetainė nepakeista."
  exit 1
fi
if docker compose up -d --build --remove-orphans; then
  docker image prune -f >/dev/null 2>&1 || true
  rm -f .auto-update-failed
  echo "$(date '+%F %T') Atnaujinta"
else
  echo "$(date '+%F %T') Surinkimas nepavyko – grąžinama ankstesnė versija ${local_rev:0:7}"
  echo "$remote_rev" > .auto-update-failed
  git reset --hard --quiet "$local_rev"
  docker compose up -d --build --remove-orphans
  exit 1
fi
