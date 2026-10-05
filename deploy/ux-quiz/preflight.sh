#!/usr/bin/env bash
# Предполётная проверка перед выкладкой (Git Bash): bash deploy/ux-quiz/preflight.sh root@1.2.3.4 quiz.example.ru
# Ничего не меняет — только смотрит и пишет ✓ / ✗ с подсказкой.
set -uo pipefail
HOST="${1:?ssh-хост, например root@1.2.3.4}"
DOMAIN="${2:?домен, например quiz.example.ru}"
IP="${HOST#*@}"
ok=0; fail=0
pass() { echo "✓ $1"; ok=$((ok+1)); }
miss() { echo "✗ $1"; echo "    → $2"; fail=$((fail+1)); }

# 1. DNS: домен указывает на сервер
RES="$(nslookup "$DOMAIN" 2>/dev/null | awk '/^Address/ {print $2}' | tail -n +2 | tr '\n' ' ')"
if echo " $RES " | grep -q " $IP "; then pass "DNS: $DOMAIN → $IP"
else miss "DNS: $DOMAIN → ${RES:-нет ответа}" "A-запись домена на $IP (распространение — от минут до пары часов)"; fi

# 2. SSH
if ssh -o BatchMode=yes -o ConnectTimeout=8 "$HOST" true 2>/dev/null; then pass "SSH до $HOST"
else miss "SSH до $HOST" "проверьте ключ/пароль: ssh $HOST"; fail=$((fail+0)); echo "Дальше без SSH проверять нечего."; echo; echo "Итого: $ok ✓, $fail ✗"; exit 1; fi

# 3. Сервер: Node, Caddy, служба, .env
REMOTE="$(ssh "$HOST" bash -s <<'R'
node -v 2>/dev/null | grep -q '^v2[4-9]' && echo node=ok || echo node=no
systemctl is-active --quiet caddy && echo caddy=ok || echo caddy=no
systemctl is-enabled --quiet ux-quiz 2>/dev/null && echo service=ok || echo service=no
E=/srv/ux-quiz/ux-quiz-server/.env
[ -f "$E" ] || { echo env=missing; exit; }
for k in BOT_TOKEN ADMIN_ID WEBHOOK_SECRET PUBLIC_URL; do grep -q "^$k=..*" "$E" && echo "$k=ok" || echo "$k=empty"; done
R
)"
has() { echo "$REMOTE" | grep -q "^$1=ok"; }
has node && pass "Node 24 на сервере" || miss "Node 24 на сервере" "запустите setup-server.sh"
has caddy && pass "Caddy работает" || miss "Caddy не запущен" "systemctl status caddy"
has service && pass "служба ux-quiz включена" || miss "служба ux-quiz не установлена" "запустите setup-server.sh"
if echo "$REMOTE" | grep -q '^env=missing'; then miss ".env бэкенда" "запустите setup-server.sh"
else for k in BOT_TOKEN ADMIN_ID WEBHOOK_SECRET PUBLIC_URL; do has "$k" && pass ".env: $k" || miss ".env: $k пуст" "nano /srv/ux-quiz/ux-quiz-server/.env"; done; fi

# 4. HTTPS (после первой выкладки)
CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$DOMAIN/health" || true)"
[ "$CODE" = "200" ] && pass "https://$DOMAIN/health отвечает" || echo "· https://$DOMAIN/health → ${CODE:-нет ответа} (нормально до первой выкладки)"

echo; echo "Итого: $ok ✓, $fail ✗"
[ "$fail" -eq 0 ] && echo "Можно выкладывать: bash deploy/ux-quiz/deploy.sh $HOST $DOMAIN"
