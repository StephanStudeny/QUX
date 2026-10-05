/**
 * Настройка бота через Bot API. Токен и адреса — из .env.
 *   npm run bot -- info      — кто я и куда смотрит вебхук
 *   npm run bot -- profile   — описание, «О боте», команды (RU + EN), кнопка меню → Mini App
 *   npm run bot -- webhook   — вебхук на ${PUBLIC_URL}/bot/webhook с секретом
 *   npm run bot -- polling   — снять вебхук (вернуться к локальному опросу)
 */
import { BOT_PROFILE } from "../src/texts.ts"

const env = process.env
const token = env.BOT_TOKEN
if (!token) throw new Error("BOT_TOKEN не задан (.env)")
const base = `https://api.telegram.org/bot${token}${env.BOT_TEST_ENV === "true" ? "/test" : ""}`
const publicUrl = (env.PUBLIC_URL ?? "").replace(/\/$/, "")

async function call(method: string, body: object = {}) {
  const res = await fetch(`${base}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
  const data = (await res.json()) as { ok: boolean; result?: unknown; description?: string }
  if (!data.ok) throw new Error(`${method}: ${data.description}`)
  return data.result
}

const need = (v: string | undefined, name: string) => {
  if (!v) throw new Error(`${name} не задан (.env)`)
  return v
}

const cmd = process.argv[2]
if (cmd === "info") {
  console.log(await call("getMe"))
  console.log(await call("getWebhookInfo"))
} else if (cmd === "profile") {
  for (const [lang, p] of Object.entries(BOT_PROFILE)) {
    const language_code = lang === "ru" ? "ru" : undefined // английский — по умолчанию для всех языков
    await call("setMyDescription", { description: p.description, language_code })
    await call("setMyShortDescription", { short_description: p.shortDescription, language_code })
    await call("setMyCommands", { commands: p.commands, language_code })
  }
  // Кнопка меню одна на все языки — аудитория в основном русскоязычная.
  if (publicUrl) await call("setChatMenuButton", { menu_button: { type: "web_app", text: BOT_PROFILE.ru.menuButton, web_app: { url: publicUrl } } })
  else console.warn("PUBLIC_URL не задан — кнопку меню пропускаю")
  console.log("Профиль бота обновлён.")
} else if (cmd === "webhook") {
  await call("setWebhook", {
    url: `${need(publicUrl, "PUBLIC_URL")}/bot/webhook`,
    secret_token: need(env.WEBHOOK_SECRET, "WEBHOOK_SECRET"),
    allowed_updates: ["message", "pre_checkout_query"],
    drop_pending_updates: false,
  })
  console.log(await call("getWebhookInfo"))
} else if (cmd === "polling") {
  await call("deleteWebhook")
  console.log("Вебхук снят.")
} else {
  console.log("Команды: info | profile | webhook | polling")
}
