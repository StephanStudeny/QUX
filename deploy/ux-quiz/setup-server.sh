#!/usr/bin/env bash
# Первичная настройка сервера. Один раз, от root: bash setup-server.sh quiz.example.ru
# Ubuntu 24.04. На Debian 12 работает без правок (ufw ставится из apt так же).
set -euo pipefail
DOMAIN="${1:?Укажите домен: bash setup-server.sh quiz.example.ru}"
HERE="$(cd "$(dirname "$0")" && pwd)"

apt-get update
apt-get install -y curl ca-certificates gnupg ufw sqlite3 debian-keyring debian-archive-keyring apt-transport-https

# Node.js 24 (NodeSource).
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs

# Caddy (официальный репозиторий).
curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
apt-get update
apt-get install -y caddy

# Пользователь и папки: releases — сборки Mini App (app — ссылка на текущую), ux-quiz-server — бэкенд, data — база, backups — копии базы.
id quiz >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin quiz
mkdir -p /srv/ux-quiz/{releases,ux-quiz-server,ux-quiz/src/config,data,backups}
chown -R quiz:quiz /srv/ux-quiz

# .env бэкенда: секрет вебхука генерируем, токен и ADMIN_ID вписываете сами (nano).
ENV=/srv/ux-quiz/ux-quiz-server/.env
if [ ! -f "$ENV" ]; then
  cat > "$ENV" <<ENVEOF
BOT_TOKEN=
ADMIN_ID=
BOT_TEST_ENV=false
PORT=8787
DB_PATH=/srv/ux-quiz/data/ux-quiz.db
CORS_ORIGINS=https://$DOMAIN
APP_LINK=https://t.me/ux_quiz_bot/play
PUBLIC_URL=https://$DOMAIN
BOT_UPDATES=webhook
WEBHOOK_SECRET=$(openssl rand -hex 32)
ENVEOF
  chown quiz:quiz "$ENV"
  chmod 600 "$ENV"
fi

# Caddy с доменом.
install -m 644 "$HERE/Caddyfile" /etc/caddy/Caddyfile
mkdir -p /etc/systemd/system/caddy.service.d
printf '[Service]\nEnvironment=DOMAIN=%s\n' "$DOMAIN" > /etc/systemd/system/caddy.service.d/domain.conf

# Служба бэкенда (запустится после первой выкладки).
install -m 644 "$HERE/ux-quiz.service" /etc/systemd/system/ux-quiz.service
systemctl daemon-reload
systemctl enable ux-quiz
systemctl restart caddy

# Ежедневная копия базы в 04:00, храним 14 дней.
cat > /etc/cron.d/ux-quiz-backup <<'CRONEOF'
0 4 * * * quiz [ -f /srv/ux-quiz/data/ux-quiz.db ] && sqlite3 /srv/ux-quiz/data/ux-quiz.db ".backup /srv/ux-quiz/backups/ux-quiz-$(date +\%F).db" && find /srv/ux-quiz/backups -name '*.db' -mtime +14 -delete
CRONEOF

# Файрвол: SSH, HTTP (выпуск сертификата), HTTPS.
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo
echo "Готово. Дальше:"
echo "  1) nano $ENV — впишите BOT_TOKEN и ADMIN_ID"
echo "  2) на своём компьютере: bash deploy/ux-quiz/deploy.sh <ssh-хост> $DOMAIN"
