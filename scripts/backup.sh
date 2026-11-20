#!/usr/bin/env bash
# Duomenų bazės ir nuotraukų atsarginė kopija. Paleisti iš projekto katalogo serveryje.
# Pvz. kasdien 3:15 (crontab -e):  15 3 * * * cd /opt/kviki && ./scripts/backup.sh >> backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
stamp=$(date +%Y%m%d-%H%M)
docker compose exec -T db pg_dump -U kviki -d kviki --format=custom > "backups/kviki-$stamp.dump"
docker compose run --rm --no-deps --user root -v "$(pwd)/backups:/backup" --entrypoint sh app -c "tar czf /backup/uploads-$stamp.tgz -C /data uploads"
# Laikome 14 paskutinių kopijų.
ls -1t backups/kviki-*.dump | tail -n +15 | xargs -r rm --
ls -1t backups/uploads-*.tgz | tail -n +15 | xargs -r rm --
echo "Atsarginė kopija sukurta: $stamp"
