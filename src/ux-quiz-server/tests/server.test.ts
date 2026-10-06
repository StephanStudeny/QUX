import { beforeEach, describe, expect, it } from "vitest"
import { cleanupStalePurchases, createApp, sendDueNotifications, type AppDeps } from "../src/app.ts"
import { parseRef, signInitData, validateInitData } from "../src/auth.ts"
import { handleUpdate } from "../src/bot.ts"
import { createSqliteStore } from "../src/store.ts"
import { createDevTelegramApi, type TelegramApi } from "../src/telegram.ts"
import { texts } from "../src/texts.ts"

const TOKEN = "123456:TEST-TOKEN"
const HOUR = 60 * 60 * 1000
const ADMIN = 900
let clock = 1_800_000_000_000

/** Telegram-заглушка для «боевого» режима: запоминает ответы на pre_checkout и сообщения. */
function fakeTg() {
  const checkouts: { id: string; ok: boolean; error?: string }[] = []
  const sent: { chatId: number; text: string; buttons?: unknown }[] = []
  const refunds: { userId: number; chargeId: string }[] = []
  const tg: TelegramApi = {
    createInvoiceLink: async ({ payload, stars }) => `https://t.me/$invoice-${payload}-${stars}`,
    answerPreCheckoutQuery: async (id: string, ok: boolean, error?: string) => void checkouts.push({ id, ok, error }),
    sendMessage: async (chatId, text, buttons) => (sent.push({ chatId, text, buttons }), true),
    getUpdates: async () => [],
    deleteWebhook: async () => {},
    refundStarPayment: async (userId, chargeId) => void refunds.push({ userId, chargeId }),
  }
  return { tg, checkouts, sent, refunds }
}

const initData = (id: number, extra: Record<string, string> = {}, authDate = Math.floor(clock / 1000)) =>
  signInitData({ auth_date: String(authDate), user: JSON.stringify({ id, first_name: `User${id}`, language_code: "ru" }), ...extra }, TOKEN)

function setup(mode: "prod" | "dev" = "prod") {
  const store = createSqliteStore(":memory:")
  const fake = fakeTg()
  const devTg = createDevTelegramApi(() => {})
  const deps: AppDeps = {
    store,
    tg: mode === "prod" ? fake.tg : devTg,
    config: {
      botToken: mode === "prod" ? TOKEN : "",
      appLink: "https://t.me/test_bot/play",
      corsOrigins: [],
      webhookSecret: "s3cret",
      adminId: ADMIN,
      publicUrl: "https://quiz.example",
    },
    now: () => clock,
    log: () => {},
  }
  const app = createApp(deps)
  const call = (path: string, user: number | null, json?: object, method = "POST") =>
    app.request(path, {
      method,
      headers: {
        "content-type": "application/json",
        ...(user == null ? {} : { authorization: mode === "prod" ? `tma ${initData(user)}` : `dev ${user}` }),
      },
      body: json && method !== "GET" ? JSON.stringify(json) : undefined,
    })
  const callAs = (raw: string, path: string, json: object = {}) =>
    app.request(path, { method: "POST", headers: { "content-type": "application/json", authorization: `tma ${raw}` }, body: JSON.stringify(json) })
  return { store, deps, app, call, callAs, ...fake, devTg }
}

beforeEach(() => {
  clock = 1_800_000_000_000
})

describe("initData", () => {
  it("принимает подпись Telegram и отвергает подделку и старую подпись", () => {
    const now = Math.floor(clock / 1000)
    expect(validateInitData(initData(7), TOKEN, now)?.user.id).toBe(7)
    expect(validateInitData(initData(7).replace("User7", "User8"), TOKEN, now)).toBeNull()
    expect(validateInitData(initData(7), "other:token", now)).toBeNull()
    expect(validateInitData(initData(7, {}, now - 2 * 24 * 3600), TOKEN, now)).toBeNull()
  })

  it("реферальный код — только ref_<число>", () => {
    expect(parseRef("ref_42")).toBe(42)
    expect(parseRef("ref_0")).toBeNull()
    expect(parseRef("ref_abc")).toBeNull()
    expect(parseRef(null)).toBeNull()
  })

  it("без подписи — 401", async () => {
    const { call } = setup()
    expect((await call("/api/session", null, {})).status).toBe(401)
  })
})

describe("рефералы и друзья", () => {
  it("новичок по ссылке привязывается к пригласившему; себя, старичка и незнакомца не привязываем", async () => {
    const { call, callAs, store } = setup()
    await call("/api/session", 1, {})
    await callAs(initData(2, { start_param: "ref_1" }), "/api/session")
    await callAs(initData(1, { start_param: "ref_1" }), "/api/session")
    await call("/api/session", 3, {})
    await callAs(initData(3, { start_param: "ref_1" }), "/api/session")
    await callAs(initData(4, { start_param: "ref_999" }), "/api/session")

    expect((await store.getUser(2))?.inviterId).toBe(1)
    expect((await store.getUser(1))?.inviterId).toBeNull()
    expect((await store.getUser(3))?.inviterId).toBeNull()
    expect((await store.getUser(4))?.inviterId).toBeNull()
    const res = await (await call("/api/session", 1, {})).json()
    expect(res.friends).toEqual([{ id: "2", name: "User2", photoUrl: null, avatar: null, progress: 0, claimed: false, level: null, blocks: 0 }])
  })

  it("прогресс для профиля: друг видит уровень, блоки, аватар и никнейм; мусор отбрасывается", async () => {
    const { call, callAs } = setup()
    await call("/api/session", 1, {})
    await callAs(initData(2, { start_param: "ref_1" }), "/api/session")

    await call("/api/progress", 2, { firstBlock: 10, level: "senior", blocks: 4, answered: 52, avatar: "fox", nickname: "  Лиса  " })
    let friends = (await (await call("/api/friends", 1, undefined, "GET")).json()).friends
    expect(friends[0]).toMatchObject({ name: "Лиса", avatar: "fox", level: "senior", blocks: 4, progress: 10 })

    // Старый клиент шлёт только firstBlock — остальное не затирается; чужой уровень не принимаем.
    await call("/api/progress", 2, { firstBlock: 10 })
    await call("/api/progress", 2, { firstBlock: 10, level: "god", blocks: 5, answered: 60, avatar: null, nickname: "" })
    friends = (await (await call("/api/friends", 1, undefined, "GET")).json()).friends
    expect(friends[0]).toMatchObject({ name: "User2", avatar: null, level: null, blocks: 5 })
    expect((await call("/api/progress", 2, { firstBlock: -1 })).status).toBe(400)
  })

  it("награда за друга — только после первого блока и один раз", async () => {
    const { call, callAs } = setup()
    await call("/api/session", 1, {})
    await callAs(initData(2, { start_param: "ref_1" }), "/api/session")

    expect((await call("/api/friends/2/claim", 1)).status).toBe(409)
    await call("/api/progress", 2, { firstBlock: 6 })
    await call("/api/progress", 2, { firstBlock: 3 })
    let friends = (await (await call("/api/friends", 1, undefined, "GET")).json()).friends
    expect(friends[0].progress).toBe(6)

    await call("/api/progress", 2, { firstBlock: 99 })
    expect((await call("/api/friends/2/claim", 3)).status).toBe(404)
    expect((await call("/api/friends/2/claim", 1)).status).toBe(200)
    expect((await call("/api/friends/2/claim", 1)).status).toBe(409)
    friends = (await (await call("/api/friends", 1, undefined, "GET")).json()).friends
    expect(friends[0]).toMatchObject({ progress: 10, claimed: true })
  })

  it("/start ref_<id> в боте тоже засчитывает новичка и отвечает кнопкой с тем же кодом", async () => {
    const { call, store, deps, sent } = setup()
    await call("/api/session", 1, {})
    await handleUpdate(
      { update_id: 1, message: { message_id: 1, chat: { id: 5, type: "private" }, from: { id: 5, first_name: "Bot", language_code: "en" }, text: "/start ref_1" } },
      { store, tg: deps.tg, appLink: deps.config.appLink, now: () => clock, log: () => {} },
    )
    expect((await store.getUser(5))?.inviterId).toBe(1)
    expect(sent[0]).toMatchObject({ chatId: 5, text: texts("en").startGreeting })
  })
})

describe("оплата Stars", () => {
  const preCheckout = (id: string, payload: string, from: number, amount: number) => ({
    update_id: 10,
    pre_checkout_query: { id, from: { id: from }, currency: "XTR", total_amount: amount, invoice_payload: payload },
  })
  const paid = (payload: string, amount: number) => ({
    update_id: 11,
    message: {
      message_id: 2,
      chat: { id: 1, type: "private" },
      successful_payment: { currency: "XTR", total_amount: amount, invoice_payload: payload, telegram_payment_charge_id: "ch_1" },
    },
  })

  it("цена берётся с сервера; неизвестный пакет — 400", async () => {
    const { call } = setup()
    expect((await call("/api/invoices", 1, { packId: "free" })).status).toBe(400)
    const inv = await (await call("/api/invoices", 1, { packId: "bundle5" })).json()
    expect(inv.invoiceUrl).toContain("-120")
  })

  it("pre_checkout сверяет сумму и владельца; successful_payment → покупку можно забрать ровно один раз", async () => {
    const { call, store, deps, checkouts } = setup()
    const botDeps = { store, tg: deps.tg, appLink: deps.config.appLink, now: () => clock, log: () => {} }
    const { purchaseId } = await (await call("/api/invoices", 1, { packId: "three" })).json()

    await handleUpdate(preCheckout("q1", purchaseId, 1, 1), botDeps)
    await handleUpdate(preCheckout("q2", purchaseId, 2, 40), botDeps)
    await handleUpdate(preCheckout("q3", purchaseId, 1, 40), botDeps)
    expect(checkouts.map((c) => c.ok)).toEqual([false, false, true])

    expect(await (await call(`/api/purchases/${purchaseId}/claim`, 1)).json()).toEqual({ status: "pending", packId: "three" })
    await handleUpdate(paid(purchaseId, 40), botDeps)
    await handleUpdate(paid(purchaseId, 40), botDeps)

    // Клиент не успел забрать — покупка придёт при следующем запуске.
    expect((await (await call("/api/session", 1, {})).json()).grants).toEqual([{ purchaseId, packId: "three" }])
    expect((await call(`/api/purchases/${purchaseId}/claim`, 2)).status).toBe(404)
    expect(await (await call(`/api/purchases/${purchaseId}/claim`, 1)).json()).toEqual({ status: "claimed", packId: "three" })
    expect(await (await call(`/api/purchases/${purchaseId}/claim`, 1)).json()).toEqual({ status: "already", packId: "three" })
    expect((await (await call("/api/session", 1, {})).json()).grants).toEqual([])

    // Повторная оплата того же счёта не проходит pre_checkout.
    await handleUpdate(preCheckout("q4", purchaseId, 1, 40), botDeps)
    expect(checkouts.at(-1)?.ok).toBe(false)
  })

  it("dev-режим: вход по `dev <id>`, счёт-мок, оплата имитируется при заборе", async () => {
    const { call } = setup("dev")
    const { purchaseId, invoiceUrl } = await (await call("/api/invoices", 7, { packId: "one" })).json()
    expect(invoiceUrl).toBe(`mock-invoice:${purchaseId}:15`)
    expect(await (await call(`/api/purchases/${purchaseId}/claim`, 7)).json()).toEqual({ status: "claimed", packId: "one" })
  })
})

describe("уведомление о новой жизни", () => {
  it("планируется к следующей жизни, отменяется выключателем и полным запасом", async () => {
    const { call, deps, sent } = setup()
    await call("/api/session", 1, {})
    const r = await (await call("/api/lives", 1, { lives: 2, anchor: clock - 20 * 60 * 1000, notify: true })).json()
    expect(r.scheduled).toBe(clock + 40 * 60 * 1000)

    expect(await sendDueNotifications(deps)).toBe(0)
    clock += HOUR
    expect(await sendDueNotifications(deps)).toBe(1)
    expect(sent[0]).toMatchObject({ chatId: 1, text: texts("ru").lifeRestored })
    expect(await sendDueNotifications(deps)).toBe(0)

    await call("/api/lives", 1, { lives: 2, anchor: clock, notify: true })
    await call("/api/lives", 1, { lives: 2, anchor: clock, notify: false })
    await call("/api/lives", 1, { lives: 5, anchor: clock, notify: true })
    clock += 2 * HOUR
    expect(await sendDueNotifications(deps)).toBe(0)
  })

  it("якорь из будущего не сдвигает уведомление", async () => {
    const { call } = setup()
    const r = await (await call("/api/lives", 1, { lives: 0, anchor: clock + 10 * HOUR, notify: true })).json()
    expect(r.scheduled).toBe(clock + HOUR)
  })
})

describe("поддержка и возврат", () => {
  const text = (from: number, t: string, lang = "ru") => ({
    update_id: 20,
    message: { message_id: 3, chat: { id: from, type: "private" }, from: { id: from, first_name: `U${from}`, language_code: lang }, text: t },
  })

  it("/paysupport: следующее сообщение уходит автору с номерами платежей; /reply отвечает игроку", async () => {
    const { call, store, deps, sent } = setup()
    const botDeps = { store, tg: deps.tg, appLink: deps.config.appLink, now: () => clock, log: () => {}, adminId: ADMIN, publicUrl: "https://quiz.example" }
    const { purchaseId } = await (await call("/api/invoices", 1, { packId: "one" })).json()
    await store.markPaid(purchaseId, "ch_42", clock)

    await handleUpdate(text(1, "просто так"), botDeps)
    expect(sent).toHaveLength(0)
    await handleUpdate(text(1, "/paysupport"), botDeps)
    await handleUpdate(text(1, "Звёзды списались, жизней нет"), botDeps)
    const toAdmin = sent.find((m) => m.chatId === ADMIN)!
    expect(toAdmin.text).toContain("Звёзды списались, жизней нет")
    expect(toAdmin.text).toContain("charge ch_42")
    expect(sent.at(-1)).toMatchObject({ chatId: 1, text: texts("ru").supportSent })

    await handleUpdate(text(1, "ещё сообщение"), botDeps)
    expect(sent.filter((m) => m.chatId === ADMIN)).toHaveLength(1)

    await handleUpdate(text(ADMIN, "/reply 1 Вернул звёзды"), botDeps)
    expect(sent.find((m) => m.chatId === 1 && m.text.includes("Вернул звёзды"))?.text).toContain(texts("ru").supportReply)
  })

  it("автору: уведомление о покупке, /stats, /sales, /top; игроку эти команды недоступны", async () => {
    const { call, store, deps, sent } = setup()
    const botDeps = { store, tg: deps.tg, appLink: deps.config.appLink, now: () => clock, log: () => {}, adminId: ADMIN }
    await call("/api/progress", 1, { firstBlock: 10, level: "middle", blocks: 3, answered: 40, avatar: null, nickname: "Стёпа" })
    const { purchaseId } = await (await call("/api/invoices", 1, { packId: "three" })).json()
    await handleUpdate(
      { update_id: 1, message: { message_id: 1, chat: { id: 1, type: "private" }, from: { id: 1, first_name: "User1", username: "u1" }, successful_payment: { currency: "XTR", total_amount: 40, invoice_payload: purchaseId, telegram_payment_charge_id: "ch_9" } } },
      botDeps,
    )
    expect(sent.at(-1)).toMatchObject({ chatId: ADMIN })
    expect(sent.at(-1)!.text).toContain("User1 (@u1)")
    expect(sent.at(-1)!.text).toContain("40 ⭐")

    await handleUpdate(text(1, "/stats"), botDeps)
    expect(sent.some((m) => m.chatId === 1)).toBe(false)

    await handleUpdate(text(ADMIN, "/stats"), botDeps)
    expect(sent.at(-1)!.text).toContain("Игроков: 1")
    expect(sent.at(-1)!.text).toContain("Звёзд: 40 ⭐")
    await handleUpdate(text(ADMIN, "/sales"), botDeps)
    expect(sent.at(-1)!.text).toContain("User1 (1) · three · 40 ⭐")
    await handleUpdate(text(ADMIN, "/top 5"), botDeps)
    expect(sent.at(-1)!.text).toContain("1. Стёпа (1) · middle · блоков 3")
  })

  it("/refund — только автору, по charge id, один раз", async () => {
    const { call, store, deps, sent, refunds } = setup()
    const botDeps = { store, tg: deps.tg, appLink: deps.config.appLink, now: () => clock, log: () => {}, adminId: ADMIN }
    const { purchaseId } = await (await call("/api/invoices", 1, { packId: "three" })).json()
    await store.markPaid(purchaseId, "ch_7", clock)

    await handleUpdate(text(1, "/refund ch_7"), botDeps)
    expect(refunds).toHaveLength(0)
    await handleUpdate(text(ADMIN, "/refund ch_7"), botDeps)
    await handleUpdate(text(ADMIN, "/refund ch_7"), botDeps)
    expect(refunds).toEqual([{ userId: 1, chargeId: "ch_7" }])
    expect((await store.getPurchase(purchaseId))?.status).toBe("refunded")
    expect(sent.some((m) => m.chatId === 1 && m.text === texts("ru").refunded(40))).toBe(true)
  })

  it("/terms ведёт на страницу на языке игрока", async () => {
    const { store, deps, sent } = setup()
    await handleUpdate(text(3, "/terms", "en"), { store, tg: deps.tg, appLink: "x", now: () => clock, publicUrl: "https://quiz.example" })
    expect(JSON.stringify(sent[0].buttons)).toContain("https://quiz.example/legal/terms-en.html")
  })
})

describe("защита и уборка", () => {
  it("лимит: не больше 10 счетов в минуту на игрока, через минуту снова можно", async () => {
    const { call } = setup()
    const codes = []
    for (let i = 0; i < 11; i++) codes.push((await call("/api/invoices", 1, { packId: "one" })).status)
    expect(codes.slice(0, 10).every((c) => c === 200)).toBe(true)
    expect(codes[10]).toBe(429)
    expect((await call("/api/invoices", 2, { packId: "one" })).status).toBe(200)
    clock += 61_000
    expect((await call("/api/invoices", 1, { packId: "one" })).status).toBe(200)
  })

  it("неоплаченные счета старше суток удаляются, оплаченные остаются", async () => {
    const { call, store, deps } = setup()
    const old = (await (await call("/api/invoices", 1, { packId: "one" })).json()).purchaseId
    const paid = (await (await call("/api/invoices", 1, { packId: "one" })).json()).purchaseId
    await store.markPaid(paid, "ch_9", clock)
    clock += 25 * HOUR
    const fresh = (await (await call("/api/invoices", 1, { packId: "one" })).json()).purchaseId
    expect(await cleanupStalePurchases(deps)).toBe(1)
    expect(await store.getPurchase(old)).toBeNull()
    expect(await store.getPurchase(paid)).not.toBeNull()
    expect(await store.getPurchase(fresh)).not.toBeNull()
  })

  it("refunded_payment от Telegram помечает покупку возвращённой", async () => {
    const { call, store, deps } = setup()
    const { purchaseId } = await (await call("/api/invoices", 1, { packId: "one" })).json()
    await store.markPaid(purchaseId, "ch_r", clock)
    await handleUpdate(
      { update_id: 30, message: { message_id: 9, chat: { id: 1, type: "private" }, refunded_payment: { currency: "XTR", total_amount: 15, invoice_payload: purchaseId, telegram_payment_charge_id: "ch_r" } } },
      { store, tg: deps.tg, appLink: "x", now: () => clock, log: () => {} },
    )
    expect((await store.getPurchase(purchaseId))?.status).toBe("refunded")
  })
})

describe("служебное", () => {
  it("вебхук и cron без секрета — 403", async () => {
    const { app } = setup()
    expect((await app.request("/bot/webhook", { method: "POST", body: "{}" })).status).toBe(403)
    expect((await app.request("/cron/tick", { method: "POST", headers: { "x-cron-secret": "nope!!" } })).status).toBe(403)
    expect((await app.request("/cron/tick", { method: "POST", headers: { "x-cron-secret": "s3cret" } })).status).toBe(200)
  })

  it("названия счетов склоняются", () => {
    const ru = texts("ru")
    expect(ru.invoiceTitle(1)).toBe("+1 жизнь")
    expect(ru.invoiceTitle(3)).toBe("+3 жизни")
    expect(ru.invoiceTitle(5, 3)).toBe("+5 жизней и по 3 подсказки")
    expect(ru.invoiceTitle(10, 6)).toBe("+10 жизней и по 6 подсказок")
    expect(texts("en").invoiceTitle(5, 3)).toBe("+5 lives and 3 of each hint")
  })
})
