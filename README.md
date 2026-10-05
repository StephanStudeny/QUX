# QUX

Telegram Mini App — викторина для продуктовых и UX/UI-дизайнеров. Бот: [@ux_quiz_bot](https://t.me/ux_quiz_bot).

| Папка | Что там |
|---|---|
| `src/ux-quiz` | Клиент: React 19, Vite, Tailwind 4 |
| `src/ux-quiz-server` | Бэкенд: Hono, node:sqlite, бот |
| `deploy/ux-quiz` | Выкладка на VPS: Caddy, systemd, скрипты |
| `design/` | Бриф и журнал решений (`game-brief.md`), банк вопросов, лого, ассеты, референсы |
| `tools/questions` | Валидатор банка вопросов |

## Локальный запуск

```sh
# бэкенд
cd src/ux-quiz-server && PORT=8787 CORS_ORIGINS=http://localhost:5179 npm run dev
# клиент
cd src/ux-quiz && VITE_API_URL=http://localhost:8787 npx vite --port 5179 --strictPort
```

Открыть http://localhost:5179/ (новый игрок) или http://localhost:5179/?demo (демо-данные).

## Выкладка

`bash deploy/ux-quiz/deploy.sh root@IP ДОМЕН` — подробности в [deploy/ux-quiz/README.md](deploy/ux-quiz/README.md).
