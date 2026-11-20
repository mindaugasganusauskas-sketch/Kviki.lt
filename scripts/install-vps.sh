#!/usr/bin/env bash
# Kviki paleidimas Hostinger VPS (Ubuntu). Paleisti iš projekto katalogo:
#   ./scripts/install-vps.sh kviki.lt
# Saugu paleisti pakartotinai: esamas .env neperrašomas, svetainė tiesiog atnaujinama.
set -euo pipefail

DOMAIN="${1:-kviki.lt}"
cd "$(dirname "$0")/.."

echo "== 1/5 Docker =="
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
docker --version

echo "== 2/5 Prievadai 80 ir 443 =="
busy=$(ss -tlnpH '( sport = :80 or sport = :443 )' 2>/dev/null | grep -v docker-proxy || true)
if [ -n "$busy" ]; then
  echo "Dėmesio: 80 arba 443 prievadą jau naudoja kita programa:"
  echo "$busy"
  echo "Jei serveryje veikia kitos svetainės, sustokite ir parašykite Claude – kitaip jos nustotų veikti."
  exit 1
fi
echo "Laisvi"

echo "== 3/5 Nustatymai (.env) =="
if [ ! -f .env ]; then
  cp deploy/env.example .env
  sed -i "s/^DOMAIN=.*/DOMAIN=${DOMAIN}/" .env
  sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 24)/" .env
  echo "Sukurtas .env (domenas ${DOMAIN}, atsitiktinis DB slaptažodis)"
else
  echo ".env jau yra – paliekamas"
fi

echo "== 4/5 Paleidimas (pirmą kartą – kelios minutės) =="
docker compose up -d --build
docker compose ps

echo "== 5/5 Automatiniai atnaujinimai ir atsarginės kopijos =="
dir=$(pwd)
chmod +x scripts/auto-update.sh scripts/backup.sh
cat > /etc/cron.d/kviki <<CRON
# Kviki: kas 5 min. tikrinami nauji pakeitimai GitHub'e, kasnakt – atsarginė kopija.
*/5 * * * * root cd ${dir} && ./scripts/auto-update.sh >> /var/log/kviki-update.log 2>&1
15 3 * * * root cd ${dir} && ./scripts/backup.sh >> /var/log/kviki-backup.log 2>&1
CRON
chmod 644 /etc/cron.d/kviki
echo "Įjungta: atnaujinimai iš šakos $(git rev-parse --abbrev-ref HEAD) kas 5 min., atsarginės kopijos kasnakt 3:15"

ip=$(hostname -I | awk '{print $1}')
dns=$(getent ahostsv4 "${DOMAIN}" | awk 'NR==1{print $1}' || true)
echo
echo "Serverio IP: ${ip}"
if [ "${dns}" = "${ip}" ]; then
  echo "DNS gerai: ${DOMAIN} → ${ip}. Svetainė: https://${DOMAIN}"
  echo "(HTTPS sertifikatas gaunamas automatiškai per 1–2 min.)"
else
  echo "DNS dar nenukreiptas: ${DOMAIN} → ${dns:-nerasta}."
  echo "Nustatykite A įrašus: @ → ${ip} ir www → ${ip}. Kai DNS atsinaujins, HTTPS įsijungs pats."
fi
