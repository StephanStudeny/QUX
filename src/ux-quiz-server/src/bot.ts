import { parseRef } from "./auth.ts"
import type { Store } from "./store.ts"
import type { TelegramApi, Update } from "./telegram.ts"
import { texts } from "./texts.ts"

export interface BotDeps {
  store: Store
  tg: TelegramApi
  /** https://t.me/<bot>/<app> — ссылка, которая открывает Mini App. */
  appLink: string
  now: () => number
  log?: (msg: string) => void
  /** Telegram id автора: сюда приходят обращения /paysupport, ему доступны /reply и /refund. */
  adminId?: number | null
  /** https://<домен> — для ссылок на условия и политику (`/legal/*.html`). Пусто — «скоро появится». */
  publicUrl?: string
}

/** Ссылка на Mini App с параметром запуска (реферальный код идёт дальше в игру). */
export const appUrl = (appLink: string, startParam?: string | null) =>
  startParam ? `${appLink}?startapp=${encodeURIComponent(startParam)}` : appLink

/** Новый пользователь пришёл по ссылке `ref_<id>` — запоминаем пригласившего (не себя, только существующего). */
export async function linkReferral(store: Store, userId: number, startParam: string | null | undefined) {
  const inviterId = parseRef(startParam)
  if (!inviterId || inviterId === userId) return
  if (!(await store.getUser(inviterId))) return
  await store.setInviter(userId, inviterId)
}

/**
 * Обработка одного обновления — одна и та же для long polling (локально) и вебхука (хостинг).
 * Оплата: pre_checkout_query — сверяем счёт и отвечаем за 10 секунд; successful_payment — зачисляем.
 */
export async function handleUpdate(update: Update, deps: BotDeps): Promise<void> {
  const { store, tg, now } = deps
  const log = deps.log ?? console.info

  const q = update.pre_checkout_query
  if (q) {
    const p = await store.getPurchase(q.invoice_payload)
    const valid = p && p.status === "pending" && p.userId === q.from.id && q.currency === "XTR" && q.total_amount === p.stars
    if (valid) await tg.answerPreCheckoutQuery(q.id, true)
    else {
      const user = await store.getUser(q.from.id)
      await tg.answerPreCheckoutQuery(q.id, false, texts(user?.language).checkoutStale)
    }
    return
  }

  const msg = update.message
  if (!msg) return

  const pay = msg.successful_payment
  if (pay) {
    const ok = await store.markPaid(pay.invoice_payload, pay.telegram_payment_charge_id, now())
    if (!ok) log(`[bot] successful_payment for unknown or non-pending purchase ${pay.invoice_payload}`)
    else if (deps.adminId) {
      const p = await store.getPurchase(pay.invoice_payload)
      const who = msg.from ? `${[msg.from.first_name, msg.from.last_name].filter(Boolean).join(" ")}${msg.from.username ? ` (@${msg.from.username})` : ""}` : "?"
      await tg
        .sendMessage(deps.adminId, `💫 Покупка: ${who}, id ${p?.userId ?? "?"}\n${p?.packId ?? "?"} — ${p?.stars ?? pay.total_amount} ⭐\ncharge ${pay.telegram_payment_charge_id}`)
        .catch((e) => log(`[bot] admin notify failed: ${String(e)}`))
    }
    return
  }

  const refund = msg.refunded_payment
  if (refund) {
    const p = await store.getPurchaseByCharge(refund.telegram_payment_charge_id)
    if (p) await store.markRefunded(p.id)
    log(`[bot] refunded_payment ${refund.telegram_payment_charge_id} → ${p ? p.id : "unknown purchase"}`)
    return
  }

  const from = msg.from
  if (!from || msg.chat.type !== "private") return
  const text = msg.text ?? ""
  const t = texts(from.language_code)
  const command = /^\/(\w+)(?:@\w+)?(?:\s+([\s\S]*))?$/.exec(text.trim())
  const name = [from.first_name, from.last_name].filter(Boolean).join(" ")
  const ensureUser = () => store.upsertUser({ id: from.id, name, photoUrl: null, language: from.language_code ?? null, now: now() })

  if (command?.[1] === "start") {
    const param = command[2]?.trim().split(/\s+/)[0] ?? null
    const { created } = await ensureUser()
    if (created) await linkReferral(store, from.id, param)
    await tg.sendMessage(msg.chat.id, t.startGreeting, [[{ text: t.startButton, url: appUrl(deps.appLink, param) }]])
    return
  }

  // Обязательная для продажи за Stars команда: обращение уходит автору вместе с номерами платежей.
  if (command?.[1] === "paysupport") {
    if (!deps.adminId) {
      await tg.sendMessage(msg.chat.id, t.supportOff)
      return
    }
    await ensureUser()
    await store.setSupportPending(from.id, true)
    await tg.sendMessage(msg.chat.id, t.supportPrompt)
    return
  }

  if (command?.[1] === "terms" || command?.[1] === "privacy") {
    const doc = command[1]
    const lang = from.language_code?.startsWith("ru") ? "ru" : "en"
    if (!deps.publicUrl) await tg.sendMessage(msg.chat.id, t.docSoon)
    else await tg.sendMessage(msg.chat.id, doc === "terms" ? t.terms : t.privacy, [[{ text: doc === "terms" ? t.terms : t.privacy, url: `${deps.publicUrl}/legal/${doc}-${lang}.html` }]])
    return
  }

  if (deps.adminId && from.id === deps.adminId && command) {
    if (await handleAdminCommand(command[1], command[2]?.trim() ?? "", deps)) return
  }

  if (!command && text && (await store.isSupportPending(from.id))) {
    await store.setSupportPending(from.id, false)
    const purchases = await store.listPurchases(from.id, 5)
    const lines = purchases.map((p) => `• ${p.packId}, ${p.stars} ⭐, ${p.status}${p.chargeId ? `, charge ${p.chargeId}` : ""}`)
    const header = `Поддержка: ${name}${from.username ? ` (@${from.username})` : ""}, id ${from.id}`
    const body = [header, "", text, "", purchases.length ? "Последние покупки:" : "Покупок нет.", ...lines, "", `Ответить: /reply ${from.id} текст`].join("\n")
    await tg.sendMessage(deps.adminId!, body)
    await tg.sendMessage(msg.chat.id, t.supportSent)
  }
}

/** Дата и время по Москве: «06.10 18:42». */
const when = (ms: number | null) =>
  ms == null ? "—" : new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(ms).replace(",", "")

const ADMIN_HELP = [
  "Команды автора:",
  "/stats — игроки, активность, звёзды",
  "/sales [N] — последние покупки (по умолчанию 20)",
  "/top [N] — игроки по пройденным блокам (по умолчанию 10)",
  "/reply <id> <текст> — ответить игроку",
  "/refund <charge id> — вернуть звёзды",
].join("\n")

/** Число из аргумента команды в пределах 1..max, иначе — значение по умолчанию. */
const limitArg = (args: string, def: number, max: number) => {
  const n = Number(args)
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : def
}

/** Команды автора. true — команда распознана и обработана. */
async function handleAdminCommand(cmd: string, args: string, deps: BotDeps): Promise<boolean> {
  const { store, tg } = deps
  const admin = deps.adminId!
  if (cmd === "admin" || cmd === "help") {
    await tg.sendMessage(admin, ADMIN_HELP)
    return true
  }
  if (cmd === "stats") {
    const s = await store.adminStats(deps.now())
    const levels = Object.entries(s.byLevel)
      .map(([l, c]) => `${l} ${c}`)
      .join(", ")
    const lines = [
      `Игроков: ${s.users} (новых за сутки ${s.newDay}, за неделю ${s.newWeek})`,
      `Активных: за сутки ${s.activeDay}, за неделю ${s.activeWeek}`,
      `По уровням: ${levels || "—"}`,
      `Пришли по приглашению: ${s.invited}`,
      "",
      `Звёзд: ${s.starsTotal} ⭐ (за неделю ${s.starsWeek}), покупок ${s.paidCount}`,
      `Возвращено: ${s.refundedStars} ⭐`,
    ]
    await tg.sendMessage(admin, lines.join("\n"))
    return true
  }
  if (cmd === "sales") {
    const sales = await store.listSales(limitArg(args, 20, 50))
    const lines = sales.map((p) => `${when(p.paidAt)} · ${p.userName} (${p.userId}) · ${p.packId} · ${p.stars} ⭐${p.status === "refunded" ? " · возврат" : ""}`)
    await tg.sendMessage(admin, sales.length ? ["Последние покупки:", ...lines].join("\n") : "Покупок пока нет.")
    return true
  }
  if (cmd === "top") {
    const top = await store.topPlayers(limitArg(args, 10, 50))
    const lines = top.map(
      (u, i) => `${i + 1}. ${u.nickname ?? u.name} (${u.id}) · ${u.level ?? "—"} · блоков ${u.blocks} · ответов ${u.answered} · друзей ${u.friends} · был ${when(u.lastSeenAt)}`,
    )
    await tg.sendMessage(admin, top.length ? lines.join("\n") : "Игроков пока нет.")
    return true
  }
  if (cmd === "reply") {
    const m = /^(\d+)\s+([\s\S]+)$/.exec(args)
    if (!m) {
      await tg.sendMessage(admin, "Формат: /reply <id игрока> <текст>")
      return true
    }
    const user = await store.getUser(Number(m[1]))
    const ok = await tg.sendMessage(Number(m[1]), `${texts(user?.language).supportReply}\n\n${m[2]}`)
    await tg.sendMessage(admin, ok ? "Отправил." : "Не доставлено: игрок не писал боту или заблокировал его.")
    return true
  }
  if (cmd === "refund") {
    const purchase = args ? await store.getPurchaseByCharge(args) : null
    if (!purchase) {
      await tg.sendMessage(admin, "Формат: /refund <charge id из обращения>. Платёж с таким номером не найден.")
      return true
    }
    if (purchase.status === "refunded") {
      await tg.sendMessage(admin, "Этот платёж уже возвращён.")
      return true
    }
    await tg.refundStarPayment(purchase.userId, args)
    await store.markRefunded(purchase.id)
    const user = await store.getUser(purchase.userId)
    await tg.sendMessage(purchase.userId, texts(user?.language).refunded(purchase.stars))
    await tg.sendMessage(admin, `Вернул ${purchase.stars} ⭐ игроку ${purchase.userId}. Начисленное в игре не отзывается.`)
    return true
  }
  return false
}

/** Long polling: локальная разработка без публичного адреса. Останавливается через signal. */
export async function runPolling(deps: BotDeps, signal: AbortSignal) {
  const log = deps.log ?? console.info
  await deps.tg.deleteWebhook()
  let offset = 0
  while (!signal.aborted) {
    try {
      const updates = await deps.tg.getUpdates(offset, 25)
      for (const u of updates) {
        offset = u.update_id + 1
        await handleUpdate(u, deps).catch((e) => log(`[bot] update ${u.update_id} failed: ${String(e)}`))
      }
    } catch (e) {
      log(`[bot] polling error: ${String(e)}`)
      await new Promise((r) => setTimeout(r, 3000))
    }
  }
}
