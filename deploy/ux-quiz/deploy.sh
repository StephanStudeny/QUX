#!/usr/bin/env bash
# Выкладка с компьютера (Git Bash): bash deploy/ux-quiz/deploy.sh root@1.2.3.4 quiz.example.ru
# Собирает Mini App под домен, заливает статику и бэкенд по SSH, перезапускает службу.
set -euo pipefail
HOST="${1:?ssh-хост, например root@1.2.3.4}"
DOMAIN="${2:?домен, например quiz.example.ru}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CLIENT="$ROOT/src/ux-quiz"
SERVER="$ROOT/src/ux-quiz-server"
STAMP="$(date +%Y%m%d%H%M%S)"

echo "→ Тесты"
(cd "$SERVER" && npx vitest run)
(cd "$CLIENT" && npx vitest run)

echo "→ Сборка Mini App для https://$DOMAIN"
(cd "$CLIENT" && VITE_API_URL="https://$DOMAIN" VITE_TELEGRAM_ONLY=true npm run build)

echo "→ Заливка"
tar -C "$CLIENT/dist" -czf - . | ssh "$HOST" "mkdir -p /srv/ux-quiz/releases/$STAMP && tar -C /srv/ux-quiz/releases/$STAMP -xzf -"
tar -C "$SERVER" -czf - src scripts package.json package-lock.json | ssh "$HOST" "tar -C /srv/ux-quiz/ux-quiz-server -xzf -"
# Бэкенд берёт цены пакетов из конфига игры — единый источник правды.
cat "$CLIENT/src/config/game.ts" | ssh "$HOST" "cat > /srv/ux-quiz/ux-quiz/src/config/game.ts"

echo "→ Переключение и перезапуск"
ssh "$HOST" bash -s <<REMOTE
set -euo pipefail
cd /srv/ux-quiz/ux-quiz-server && npm ci --omit=dev --no-audit --no-fund
# Статика переключается атомарно: app — ссылка на свежий релиз, 5 последних релизов храним для отката.
ln -sfn /srv/ux-quiz/releases/$STAMP /srv/ux-quiz/app.new && mv -Tf /srv/ux-quiz/app.new /srv/ux-quiz/app
ls -1dt /srv/ux-quiz/releases/* | tail -n +6 | xargs -r rm -rf
chown -R quiz:quiz /srv/ux-quiz && chmod -R a+rX /srv/ux-quiz/releases
systemctl restart ux-quiz
sleep 2
curl -fsS http://127.0.0.1:8787/health && echo
REMOTE
echo "✓ Выложено: https://$DOMAIN"
