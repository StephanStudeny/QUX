# ux-quiz-server

Бэкенд UX-викторины: оплата в Telegram Stars, рефералы и награды за друзей, уведомление «Жизнь восстановилась».
Прогресс игры хранится на клиенте (CloudStorage). Сервер отвечает за всё, что даёт награды.

Стек: Node 24 (TypeScript запускается без сборки), Hono, SQLite из `node:sqlite`, Bot API через `fetch`.

## Запуск локально

```sh
npm install
npm run dev          # http://localhost:8787, перезапуск при правках
npm test             # 16 тестов: подпись, рефералы, оплата, поддержка, возврат, уведомления
```

Без `BOT_TOKEN` сервер работает в **dev-режиме**:
- вход по заголовку `Authorization: dev <id>`;
- счёт — строка `mock-invoice:…`;
- оплата засчитывается при первом запросе на забор покупки;
- сообщения бота пишутся в консоль.

Игра против локального сервера:

```sh
cd ../ux-quiz
VITE_API_URL=http://localhost:8787 npm run dev -- --port 5179
```

Без `VITE_API_URL` игра работает как раньше. В браузере покупки и друзья идут через мок. В Telegram покупки недоступны.

Настройки — в `.env` (образец `.env.example`).

## API

Все `/api/*` требуют `Authorization: tma <initData>`: подпись Telegram проверяется на сервере.

| Метод | Что делает |
|---|---|
| `POST /api/session` | Регистрирует игрока. Новичка по ссылке `ref_<id>` привязывает к пригласившему. Отдаёт `grants` (оплаченные, но не забранные покупки) и `friends`. |
| `POST /api/invoices` `{packId}` | Создаёт счёт в Stars. Цена берётся из `LIFE_PACKS` на сервере. |
| `POST /api/purchases/:id/claim` | `claimed` — ровно один раз после `successful_payment`. `pending` — оплата ещё не пришла. `already` — покупка уже забрана. |
| `GET /api/friends` | Приглашённые друзья и их прогресс первого блока. |
| `POST /api/friends/:id/claim` | Награда за друга: только после первого блока и один раз. |
| `POST /api/progress` `{firstBlock}` | Сколько вопросов первого блока пройдено. Значение только растёт. |
| `POST /api/lives` `{lives, anchor, notify}` | Планирует уведомление к следующей жизни или отменяет его. |
| `POST /bot/webhook` | Обновления бота на хостинге (заголовок `X-Telegram-Bot-Api-Secret-Token`). |
| `POST /cron/tick` | Отправка наступивших уведомлений (заголовок `X-Cron-Secret`). |

Путь оплаты:
1. `invoices`: покупка `pending`.
2. Окно оплаты Telegram.
3. `pre_checkout_query`: сервер сверяет владельца и сумму.
4. `successful_payment`: покупка `paid`.
5. `claim`: покупка `claimed`, клиент начисляет.

Если клиент закрылся до шага 5, покупка придёт в `grants` при следующем запуске.

## Бот

| Команда | Кто | Что делает |
|---|---|---|
| `/start [ref_<id>]` | все | Приветствие и кнопка «Играть». Новичок по `ref_<id>` засчитывается пригласившему |
| `/paysupport` | все | Следующее сообщение игрока уходит автору (`ADMIN_ID`) вместе с последними платежами. Команда обязательна для продажи за Stars |
| `/terms`, `/privacy` | все | Ссылка на `PUBLIC_URL/legal/{terms,privacy}-{ru,en}.html` |
| `/reply <id> <текст>` | автор | Ответ игроку от имени бота |
| `/refund <charge id>` | автор | Возврат звёзд (`refundStarPayment`). Начисленное в игре не отзывается |

Настройка бота — `npm run bot -- info | profile | webhook | polling` (`scripts/bot.ts`, тексты профиля — `BOT_PROFILE` в `src/texts.ts`).

## Переезд на хостинг

Свой сервер (VPS) — комплект в [`qux/deploy/ux-quiz/`](../../deploy/ux-quiz/README.md): Caddy, служба, скрипты настройки и выкладки.

Serverless (Vercel, облачные функции) — если понадобится:
1. Новая реализация `Store` (`src/store.ts`) на Turso или Postgres.
2. Короткий entry с `createApp(...)` и `export default app.fetch`.
3. Cron раз в минуту на `POST /cron/tick` с `X-Cron-Secret`.
