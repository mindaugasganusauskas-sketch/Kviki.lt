#!/usr/bin/env bash
# Kviki paleidimas Hostinger VPS (Ubuntu). Paleisti iš projekto katalogo:
#   ./scripts/install-vps.sh kviki.lt
# Saugu paleisti pakartotinai: esamas .env ir nginx nustatymai neperrašomi.
#
# Du režimai:
#  - tuščias serveris: HTTPS ir domeną aptarnauja Caddy (docker-compose.yml);
#  - serveryje jau veikia nginx su kitomis svetainėmis: jų neliečiame, Kviki
#    veikia 127.0.0.1 prievade, o nginx nukreipia domeną į jį (deploy/compose.nginx.yml).
set -euo pipefail

DOMAIN="${1:-kviki.lt}"
cd "$(dirname "$0")/.."

env_set() { # env_set RAKTAS reikšmė – įrašo arba pakeičia eilutę .env faile
  if grep -q "^$1=" .env; then sed -i "s|^$1=.*|$1=$2|" .env; else echo "$1=$2" >> .env; fi
}

echo "== 1/6 Docker =="
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
docker --version
docker compose version

echo "== 2/6 Nustatymai (.env) =="
if [ ! -f .env ]; then
  cp deploy/env.example .env
  env_set DOMAIN "${DOMAIN}"
  env_set POSTGRES_PASSWORD "$(openssl rand -hex 24)"
  echo "Sukurtas .env (domenas ${DOMAIN}, atsitiktinis DB slaptažodis)"
else
  echo ".env jau yra – paliekamas"
fi

echo "== 3/6 Režimas =="
mode=caddy
if grep -q "^COMPOSE_FILE=.*compose.nginx.yml" .env; then
  mode=nginx
else
  busy=$(ss -tlnpH '( sport = :80 or sport = :443 )' 2>/dev/null | grep -v docker-proxy || true)
  if [ -n "$busy" ]; then
    if echo "$busy" | grep -q '"nginx"' && systemctl is-active --quiet nginx; then
      mode=nginx
    else
      echo "Dėmesio: 80 arba 443 prievadą naudoja ne nginx, o kita programa:"
      echo "$busy"
      echo "Sustokite ir parašykite Claude – kitaip kitos svetainės gali nustoti veikti."
      exit 1
    fi
  fi
fi

if [ "$mode" = nginx ]; then
  echo "Serveryje jau veikia nginx – jo ir kitų svetainių neliečiame, Kviki bus už nginx."
  port=$(grep -E "^APP_PORT=" .env | cut -d= -f2 || true)
  if [ -z "$port" ]; then
    port=3010
    while ss -tlnH "( sport = :$port )" 2>/dev/null | grep -q .; do port=$((port + 1)); done
    env_set APP_PORT "$port"
  fi
  grep -q "^COMPOSE_FILE=.*compose.nginx.yml" .env || env_set COMPOSE_FILE "docker-compose.yml:deploy/compose.nginx.yml"
  echo "Kviki prievadas serverio viduje: 127.0.0.1:${port}"
else
  echo "Tuščias serveris – HTTPS aptarnaus Caddy."
fi

echo "== 4/6 Paleidimas (pirmą kartą – kelios minutės) =="
free -h | awk 'NR<=2'
docker compose up -d --build
docker compose ps

if [ "$mode" = nginx ]; then
  echo "== 5/6 nginx ir HTTPS =="
  for i in $(seq 1 30); do
    curl -fsS "http://127.0.0.1:${port}/api/health" >/dev/null 2>&1 && break
    sleep 2
  done
  curl -fsS "http://127.0.0.1:${port}/api/health" && echo " ← svetainė veikia serverio viduje"

  site=/etc/nginx/sites-available/kviki
  if [ ! -f "$site" ]; then
    sed -e "s/__DOMAIN__/${DOMAIN}/g" -e "s/__APP_PORT__/${port}/g" deploy/nginx-kviki.conf > "$site"
    ln -sf "$site" /etc/nginx/sites-enabled/kviki
    if nginx -t; then
      systemctl reload nginx
      echo "nginx: pridėta svetainė ${DOMAIN} (kitos svetainės nepakeistos)"
    else
      rm -f /etc/nginx/sites-enabled/kviki "$site"
      echo "nginx nustatymų patikra nepavyko – Kviki svetainė pašalinta, kitos veikia kaip anksčiau. Parašykite Claude."
      exit 1
    fi
  else
    echo "nginx: svetainė ${DOMAIN} jau sukonfigūruota – paliekama"
  fi
fi

ip=$(hostname -I | awk '{print $1}')
dns=$(getent ahostsv4 "${DOMAIN}" | awk 'NR==1{print $1}' || true)
dns_ok=no
[ "${dns}" = "${ip}" ] && dns_ok=yes

if [ "$mode" = nginx ]; then
  if [ -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
    echo "HTTPS sertifikatas jau yra"
  elif [ "$dns_ok" = yes ]; then
    command -v certbot >/dev/null 2>&1 || apt-get install -y certbot python3-certbot-nginx
    certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" --redirect --non-interactive --agree-tos --register-unsafely-without-email \
      || echo "HTTPS sertifikato gauti nepavyko – svetainė veikia per http. Parašykite Claude."
  else
    echo "HTTPS sertifikatas bus išduotas, kai DNS rodys į šį serverį – tada paleiskite šį skriptą dar kartą."
  fi
fi

echo "== 6/6 Automatiniai atnaujinimai ir atsarginės kopijos =="
dir=$(pwd)
chmod +x scripts/auto-update.sh scripts/backup.sh
cat > /etc/cron.d/kviki <<CRON
# Kviki: kas 5 min. tikrinami nauji pakeitimai GitHub'e, kasnakt – atsarginė kopija.
*/5 * * * * root cd ${dir} && ./scripts/auto-update.sh >> /var/log/kviki-update.log 2>&1
15 3 * * * root cd ${dir} && ./scripts/backup.sh >> /var/log/kviki-backup.log 2>&1
CRON
chmod 644 /etc/cron.d/kviki
echo "Įjungta: atnaujinimai iš šakos $(git rev-parse --abbrev-ref HEAD) kas 5 min., atsarginės kopijos kasnakt 3:15"

echo
echo "Serverio IP: ${ip}"
if [ "$dns_ok" = yes ]; then
  echo "DNS gerai: ${DOMAIN} → ${ip}. Svetainė: https://${DOMAIN}"
  [ "$mode" = caddy ] && echo "(HTTPS sertifikatas gaunamas automatiškai per 1–2 min.)"
else
  echo "DNS dar nenukreiptas: ${DOMAIN} → ${dns:-nerasta}."
  echo "Nustatykite A įrašus: @ → ${ip} ir www → ${ip}."
fi
