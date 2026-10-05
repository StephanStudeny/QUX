# Выкладка QUX на свой сервер

Одна машина держит всё сразу. Caddy (HTTPS) отдаёт статику Mini App и проксирует `/api` и `/bot` на Node-сервер, база — SQLite-файл.
Писалось под Ubuntu 24.04, Debian 12 подходит без правок.

| Файл | Что делает |
|---|---|
| `setup-server.sh` | Один раз от root: Node 24, Caddy, файрвол, пользователь `quiz`, служба, `.env`, ежедневный бэкап базы |
| `Caddyfile` | HTTPS для домена, статика, прокси на `127.0.0.1:8787` |
| `ux-quiz.service` | Служба бэкенда: автозапуск и перезапуск при падении |
| `preflight.sh` | С компьютера, ничего не меняет: DNS, SSH, Node/Caddy/служба, заполненность `.env`, HTTPS — ✓/✗ с подсказкой |
| `deploy.sh` | С компьютера: тесты → сборка → заливка по SSH → перезапуск. Последние 5 сборок хранятся для отката |

## День переезда

1. **DNS.** A-запись `домен → IP сервера`. Сделать первым: запись расходится от минут до пары часов.
2. **Подготовка сервера** (на своём компьютере, в Git Bash из папки `qux`):
   ```sh
   scp -r deploy/ux-quiz root@IP:/root/
   ssh root@IP "bash /root/ux-quiz/setup-server.sh ДОМЕН"
   ```
3. **Секреты.** Подключиться к серверу (`ssh root@IP`), выполнить `nano /srv/ux-quiz/ux-quiz-server/.env` и вписать:
   - `BOT_TOKEN` — из @BotFather;
   - `ADMIN_ID` — свой Telegram id, его покажет @userinfobot.

   `WEBHOOK_SECRET` уже сгенерирован.
4. **Проверка и выкладка:** сначала `bash deploy/ux-quiz/preflight.sh root@IP ДОМЕН` (всё ✓), затем
   ```sh
   bash deploy/ux-quiz/deploy.sh root@IP ДОМЕН
   ```
   В конце должен прийти ответ `{"ok":true,"dev":false}`.
5. **Бот** (на сервере, из `/srv/ux-quiz/ux-quiz-server`):
   ```sh
   sudo -u quiz npm run bot -- webhook   # вебхук на https://ДОМЕН/bot/webhook
   sudo -u quiz npm run bot -- profile   # описание, команды, кнопка меню
   sudo -u quiz npm run bot -- info      # проверка
   ```
6. **@BotFather:**
   - `/setuserpic` → `qux/design/logo/qux-avatar-512.png`;
   - `/newapp` → бот `@ux_quiz_bot`, название **QUX**, описание, обложка `qux/design/logo/qux-cover-640x360.png`, URL `https://ДОМЕН`, short name `play`.
7. **Проверка в Telegram:**
   - `/start` отвечает и показывает кнопку;
   - `t.me/ux_quiz_bot/play` открывает игру;
   - покупка «+1» за 15 ⭐ проходит → `/paysupport` → `/refund <charge id>` возвращает звёзды;
   - реферальная ссылка засчитывает друга.

## Повседневное

- Новая версия — снова `deploy.sh`.
- Логи: `journalctl -u ux-quiz -f`.
- Откат статики: `ln -sfn /srv/ux-quiz/releases/<папка> /srv/ux-quiz/app`.
- Бэкапы базы: `/srv/ux-quiz/backups/`, 14 дней.

## Перед первой выкладкой

- [x] Условия и политика (`src/ux-quiz/public/legal/*.html`): владелец, редакция от 06.10.2026, хостинг Play2Go (Германия), хранение до удаления аккаунта. Пункт про 152-ФЗ (оператор ПДн, уведомление РКН) — показать юристу.
- [x] Цены в `LIFE_PACKS` (`src/ux-quiz/src/config/game.ts`) — на старт оставлены 15 / 40 / 120 / 220 ⭐ (2026-10-05).
- [x] Обложка 640×360 и аватар бота 512×512 — `qux/design/logo/qux-*` (и в Figma, секция «06 Бренд и публикация»).
