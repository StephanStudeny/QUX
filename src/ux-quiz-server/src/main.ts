import { serve } from "@hono/node-server"
import { cleanupStalePurchases, createApp, sendDueNotifications, type AppDeps } from "./app.ts"
import { runPolling } from "./bot.ts"
import { createSqliteStore } from "./store.ts"
import { createDevTelegramApi, createTelegramApi } from "./telegram.ts"

/**
 * Запуск на Node (локально или на VPS). Для Vercel / облачных функций будет свой короткий
 * entry с тем же createApp — меняется только способ запуска, не логика.
 */
const env = process.env
const botToken = env.BOT_TOKEN ?? ""
const updatesMode = env.BOT_UPDATES === "webhook" ? "webhook" : "polling"

if (updatesMode === "webhook" && !env.WEBHOOK_SECRET) throw new Error("WEBHOOK_SECRET is required for BOT_UPDATES=webhook")

const deps: AppDeps = {
  store: createSqliteStore(env.DB_PATH ?? "./ux-quiz.db"),
  tg: botToken ? createTelegramApi(botToken, env.BOT_TEST_ENV === "true") : createDevTelegramApi(),
  config: {
    botToken,
    appLink: env.APP_LINK ?? "https://t.me/ux_quiz_bot/play",
    corsOrigins: (env.CORS_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    webhookSecret: env.WEBHOOK_SECRET ?? "",
    adminId: env.ADMIN_ID ? Number(env.ADMIN_ID) : null,
    publicUrl: (env.PUBLIC_URL ?? "").replace(/\/$/, ""),
  },
}

const app = createApp(deps)
const port = Number(env.PORT ?? 8787)
serve({ fetch: app.fetch, port }, () => {
  console.info(`ux-quiz-server :${port} — ${botToken ? `bot (${updatesMode}${env.BOT_TEST_ENV === "true" ? ", test env" : ""})` : "DEV mode, no Telegram"}`)
})

const stop = new AbortController()
if (botToken && updatesMode === "polling") void runPolling({ ...deps, appLink: deps.config.appLink, adminId: deps.config.adminId, publicUrl: deps.config.publicUrl, now: Date.now }, stop.signal)

// Уведомления о жизнях: проверка раз в минуту. На VPS работает этот таймер; на serverless — cron на /cron/tick.
let ticks = 0
const timer = setInterval(() => {
  sendDueNotifications(deps).catch((e) => console.error("[notify]", e))
  // Раз в час — чистка неоплаченных счетов старше суток.
  if (++ticks % 60 === 0) cleanupStalePurchases(deps).catch((e) => console.error("[cleanup]", e))
}, 60_000)

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    stop.abort()
    clearInterval(timer)
    process.exit(0)
  })
}
