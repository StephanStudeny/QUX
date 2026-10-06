import { randomUUID } from "node:crypto"
import { Hono, type Context } from "hono"
import { cors } from "hono/cors"
import { GAME, LEVELS, LIFE_PACKS } from "../../ux-quiz/src/config/game.ts"
import { validateInitData } from "./auth.ts"
import { appUrl, handleUpdate, linkReferral, type BotDeps } from "./bot.ts"
import type { Purchase, Store, User } from "./store.ts"
import type { TelegramApi, Update } from "./telegram.ts"
import { texts } from "./texts.ts"

export interface AppConfig {
  /** Пусто — dev-режим: вход по `Authorization: dev <id>`, оплата имитируется. */
  botToken: string
  appLink: string
  corsOrigins: string[]
  webhookSecret: string
  /** Telegram id автора (поддержка /paysupport, команды /reply и /refund). */
  adminId?: number | null
  /** https://<домен> — ссылки на условия и политику. */
  publicUrl?: string
}

export interface AppDeps {
  store: Store
  tg: TelegramApi
  config: AppConfig
  now?: () => number
  log?: (msg: string) => void
}

interface AuthUser {
  id: number
  name: string
  photoUrl: string | null
  language: string | null
  startParam: string | null
}

type Env = { Variables: { user: AuthUser } }

/** Строка друга для экрана 1.5 — формат клиентского `Friend`. */
const toFriend = (u: User) => ({
  id: String(u.id),
  name: u.nickname ?? u.name,
  photoUrl: u.photoUrl,
  avatar: u.avatar,
  progress: u.firstBlock,
  claimed: u.inviteRewardClaimed,
  level: u.level,
  blocks: u.blocks,
})
const toGrant = (p: Purchase) => ({ purchaseId: p.id, packId: p.packId })

/** Секрет из заголовка сверяется без утечки по времени ответа. */
function secretOk(given: string | undefined, expected: string) {
  if (!expected || !given || given.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

/**
 * HTTP-приложение. Ничего не знает о том, где запущено: Node (main.ts), Vercel или облачная функция
 * получают один и тот же `app.fetch`.
 */
export function createApp(deps: AppDeps) {
  const { store, tg, config } = deps
  const now = deps.now ?? Date.now
  const log = deps.log ?? console.info
  const dev = !config.botToken
  const botDeps: BotDeps = { store, tg, appLink: config.appLink, now, log, adminId: config.adminId, publicUrl: config.publicUrl }

  const app = new Hono<Env>()

  app.use("/api/*", cors({ origin: config.corsOrigins.length ? config.corsOrigins : "*", allowHeaders: ["authorization", "content-type"] }))

  /** Вход: `Authorization: tma <initData>` (подпись Telegram); в dev-режиме — `dev <id>`. */
  app.use("/api/*", async (c, next) => {
    if (c.req.method === "OPTIONS") return next()
    const header = c.req.header("authorization") ?? ""
    const [scheme, ...rest] = header.split(" ")
    const value = rest.join(" ")
    let user: AuthUser | null = null
    if (scheme === "tma" && config.botToken) {
      const data = validateInitData(value, config.botToken, Math.floor(now() / 1000))
      if (data) {
        const u = data.user
        user = {
          id: u.id,
          name: [u.first_name, u.last_name].filter(Boolean).join(" "),
          photoUrl: u.photo_url ?? null,
          language: u.language_code ?? null,
          startParam: data.startParam,
        }
      }
    } else if (scheme === "dev" && dev) {
      const id = Number(value)
      if (Number.isSafeInteger(id) && id > 0) user = { id, name: `Dev ${id}`, photoUrl: null, language: "ru", startParam: null }
    }
    if (!user) return c.json({ error: "unauthorized" }, 401)
    c.set("user", user)
    await next()
  })

  // Простой лимит частоты на игрока: защищает базу от спама счетами и запросами.
  // Память процесса — достаточно для одного сервера; при нескольких — вынести в общий кэш.
  const hits = new Map<string, { n: number; reset: number }>()
  const LIMITS: Record<string, number> = { "/api/invoices": 10 }
  app.use("/api/*", async (c, next) => {
    if (c.req.method === "OPTIONS") return next()
    const path = c.req.path
    const limit = LIMITS[path] ?? 120
    const key = `${c.get("user").id}:${LIMITS[path] ? path : "*"}`
    const t = now()
    const h = hits.get(key)
    if (!h || h.reset <= t) hits.set(key, { n: 1, reset: t + 60_000 })
    else if (++h.n > limit) return c.json({ error: "too many requests" }, 429)
    if (hits.size > 50_000) for (const [k, v] of hits) if (v.reset <= t) hits.delete(k)
    await next()
  })

  const body = async <T>(c: Context<Env>): Promise<Partial<T>> => {
    try {
      return ((await c.req.json()) ?? {}) as Partial<T>
    } catch {
      return {}
    }
  }

  /**
   * Запуск Mini App: регистрируем игрока, привязываем пригласившего (только новичка),
   * отдаём неполученные покупки и список друзей.
   */
  app.post("/api/session", async (c) => {
    const u = c.get("user")
    const b = await body<{ startParam: string }>(c)
    const { created } = await store.upsertUser({ id: u.id, name: u.name, photoUrl: u.photoUrl, language: u.language, now: now() })
    if (created) await linkReferral(store, u.id, u.startParam ?? (dev ? b.startParam : null))
    const [grants, friends] = await Promise.all([store.listUnclaimed(u.id), store.listFriends(u.id)])
    return c.json({ grants: grants.map(toGrant), friends: friends.map(toFriend) })
  })

  /** Счёт на пакет. Цена — с сервера (LIFE_PACKS), клиент передаёт только id пакета. */
  app.post("/api/invoices", async (c) => {
    const u = c.get("user")
    const { packId } = await body<{ packId: string }>(c)
    const pack = LIFE_PACKS.find((p) => p.id === packId)
    if (!pack) return c.json({ error: "unknown pack" }, 400)
    await store.upsertUser({ id: u.id, name: u.name, photoUrl: u.photoUrl, language: u.language, now: now() })
    const id = randomUUID()
    await store.createPurchase({ id, userId: u.id, packId: pack.id, stars: pack.stars, createdAt: now() })
    const t = texts(u.language)
    const invoiceUrl = await tg.createInvoiceLink({
      title: t.invoiceTitle(pack.lives, "hints" in pack ? pack.hints : undefined),
      description: t.invoiceDescription,
      payload: id,
      stars: pack.stars,
    })
    return c.json({ purchaseId: id, invoiceUrl })
  })

  /**
   * Забрать покупку: paid → claimed ровно один раз. pending — Telegram ещё не прислал successful_payment,
   * клиент повторит запрос. В dev-режиме сервер сам «получает» оплату.
   */
  app.post("/api/purchases/:id/claim", async (c) => {
    const u = c.get("user")
    const p = await store.getPurchase(c.req.param("id"))
    if (!p || p.userId !== u.id) return c.json({ error: "not found" }, 404)
    if (dev && p.status === "pending") await store.markPaid(p.id, `dev-${p.id}`, now())
    if (await store.markClaimed(p.id, u.id)) return c.json({ status: "claimed", packId: p.packId })
    const fresh = await store.getPurchase(p.id)
    return c.json({ status: fresh?.status === "claimed" ? "already" : "pending", packId: p.packId })
  })

  app.get("/api/friends", async (c) => {
    const friends = await store.listFriends(c.get("user").id)
    return c.json({ friends: friends.map(toFriend) })
  })

  /** Награда за друга: только за прошедшего первый блок и только один раз. */
  app.post("/api/friends/:id/claim", async (c) => {
    const u = c.get("user")
    const friendId = Number(c.req.param("id"))
    const friend = Number.isSafeInteger(friendId) ? await store.getUser(friendId) : null
    if (!friend || friend.inviterId !== u.id) return c.json({ error: "not found" }, 404)
    if (friend.firstBlock < GAME.blockSize) return c.json({ error: "not qualified" }, 409)
    if (!(await store.claimInviteReward(u.id, friendId))) return c.json({ error: "already claimed" }, 409)
    return c.json({ ok: true })
  })

  /**
   * Прогресс игрока. firstBlock — по нему пригласивший видит «прошёл 6 из 10»; уровень, блоки, ответы,
   * аватар и никнейм — для профиля друзей и статистики автора. Старые клиенты шлют только firstBlock.
   */
  app.post("/api/progress", async (c) => {
    const b = await body<{ firstBlock: number; level: string; blocks: number; answered: number; avatar: string | null; nickname: string | null }>(c)
    const count = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 ? (v as number) : null)
    const firstBlock = count(b.firstBlock)
    if (firstBlock === null) return c.json({ error: "bad firstBlock" }, 400)
    const blocks = count(b.blocks)
    const short = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null)
    // Отчёт может обогнать /api/session — без записи игрока UPDATE ничего бы не сохранил.
    const u = c.get("user")
    await store.upsertUser({ id: u.id, name: u.name, photoUrl: u.photoUrl, language: u.language, now: now() })
    await store.setProgress(
      u.id,
      blocks === null
        ? { firstBlock: Math.min(GAME.blockSize, firstBlock) }
        : {
            firstBlock: Math.min(GAME.blockSize, firstBlock),
            level: LEVELS.includes(b.level as never) ? b.level! : null,
            blocks,
            answered: count(b.answered) ?? 0,
            avatar: short(b.avatar, 32),
            nickname: short(b.nickname, 32),
          },
      now(),
    )
    return c.json({ ok: true })
  })

  /**
   * Жизни для уведомления «Жизнь восстановилась». Клиент присылает состояние при изменении;
   * сервер держит одно запланированное сообщение на игрока — к моменту следующей жизни.
   */
  app.post("/api/lives", async (c) => {
    const u = c.get("user")
    const { lives, anchor, notify } = await body<{ lives: number; anchor: number; notify: boolean }>(c)
    if (!Number.isInteger(lives) || !Number.isFinite(anchor)) return c.json({ error: "bad lives" }, 400)
    const t = now()
    if (!notify || lives! >= GAME.livesRegenCap) {
      await store.cancelNotification(u.id)
      return c.json({ scheduled: null })
    }
    // Якорь из будущего или из далёкого прошлого — не доверяем, считаем от «сейчас».
    const a = anchor! > t || t - anchor! > GAME.livesRegenMs ? t : anchor!
    const dueAt = a + GAME.livesRegenMs
    await store.scheduleNotification({ userId: u.id, dueAt, language: u.language })
    return c.json({ scheduled: dueAt })
  })

  /** Вебхук бота (хостинг). Telegram подписывает запрос секретом из setWebhook. */
  app.post("/bot/webhook", async (c) => {
    if (!secretOk(c.req.header("x-telegram-bot-api-secret-token"), config.webhookSecret)) return c.json({ error: "forbidden" }, 403)
    await handleUpdate((await c.req.json()) as Update, botDeps)
    return c.json({ ok: true })
  })

  /** Рассылка наступивших уведомлений. Локально — таймер в main.ts, на хостинге — cron раз в минуту. */
  app.post("/cron/tick", async (c) => {
    if (!secretOk(c.req.header("x-cron-secret"), config.webhookSecret)) return c.json({ error: "forbidden" }, 403)
    return c.json({ sent: await sendDueNotifications(deps) })
  })

  app.get("/health", (c) => c.json({ ok: true, dev }))

  return app
}

/** Счёт, который не оплатили за сутки, уже не оплатят: Telegram держит ссылку недолго. */
export async function cleanupStalePurchases({ store, now = Date.now }: AppDeps): Promise<number> {
  return store.deleteStalePending(now() - 24 * 60 * 60 * 1000)
}

export async function sendDueNotifications({ store, tg, config, now = Date.now, log = console.info }: AppDeps): Promise<number> {
  const due = await store.takeDueNotifications(now())
  let sent = 0
  for (const n of due) {
    const t = texts(n.language)
    try {
      if (await tg.sendMessage(n.userId, t.lifeRestored, [[{ text: t.lifeButton, url: appUrl(config.appLink) }]])) sent++
    } catch (e) {
      log(`[notify] ${n.userId}: ${String(e)}`)
    }
  }
  return sent
}
