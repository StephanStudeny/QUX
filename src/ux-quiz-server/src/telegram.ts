/**
 * Минимальный клиент Bot API — только методы, которые нужны игре.
 * Без библиотек: обычный fetch работает на Node, Vercel и в облачных функциях одинаково.
 */
export interface InlineButton {
  text: string
  url?: string
  web_app?: { url: string }
}

export interface TelegramApi {
  /** Ссылка на счёт в Stars (currency XTR, provider_token не нужен). */
  createInvoiceLink(p: { title: string; description: string; payload: string; stars: number }): Promise<string>
  answerPreCheckoutQuery(id: string, ok: true): Promise<void>
  answerPreCheckoutQuery(id: string, ok: false, errorMessage: string): Promise<void>
  /** false — пользователь не открыл чат с ботом или заблокировал его (403). */
  sendMessage(chatId: number, text: string, buttons?: InlineButton[][]): Promise<boolean>
  getUpdates(offset: number, timeoutSec: number): Promise<Update[]>
  deleteWebhook(): Promise<void>
  /** Возврат звёзд игроку по номеру платежа. */
  refundStarPayment(userId: number, chargeId: string): Promise<void>
}

/** Подмножество Update, которое разбирает бот. */
export interface Update {
  update_id: number
  message?: {
    message_id: number
    chat: { id: number; type: string }
    from?: { id: number; first_name: string; last_name?: string; username?: string; language_code?: string }
    text?: string
    successful_payment?: {
      currency: string
      total_amount: number
      invoice_payload: string
      telegram_payment_charge_id: string
    }
    /** Возврат, сделанный не через бота (например, Telegram по спору). */
    refunded_payment?: {
      currency: string
      total_amount: number
      invoice_payload: string
      telegram_payment_charge_id: string
    }
  }
  pre_checkout_query?: {
    id: string
    from: { id: number }
    currency: string
    total_amount: number
    invoice_payload: string
  }
}

export class TelegramError extends Error {
  readonly code: number
  constructor(method: string, code: number, description: string) {
    super(`${method}: ${code} ${description}`)
    this.code = code
  }
}

export function createTelegramApi(token: string, testEnv: boolean): TelegramApi {
  const base = `https://api.telegram.org/bot${token}${testEnv ? "/test" : ""}`

  async function call<T>(method: string, body: object): Promise<T> {
    const res = await fetch(`${base}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = (await res.json()) as { ok: boolean; result: T; error_code?: number; description?: string }
    if (!data.ok) throw new TelegramError(method, data.error_code ?? res.status, data.description ?? "")
    return data.result
  }

  return {
    createInvoiceLink: ({ title, description, payload, stars }) =>
      call<string>("createInvoiceLink", { title, description, payload, currency: "XTR", prices: [{ label: title, amount: stars }] }),
    async answerPreCheckoutQuery(id: string, ok: boolean, errorMessage?: string) {
      await call("answerPreCheckoutQuery", ok ? { pre_checkout_query_id: id, ok } : { pre_checkout_query_id: id, ok, error_message: errorMessage })
    },
    async sendMessage(chatId, text, buttons) {
      try {
        await call("sendMessage", { chat_id: chatId, text, ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}) })
        return true
      } catch (e) {
        if (e instanceof TelegramError && (e.code === 403 || e.code === 400)) return false
        throw e
      }
    },
    getUpdates: (offset, timeoutSec) =>
      call<Update[]>("getUpdates", { offset, timeout: timeoutSec, allowed_updates: ["message", "pre_checkout_query"] }),
    async deleteWebhook() {
      await call("deleteWebhook", {})
    },
    async refundStarPayment(userId, chargeId) {
      await call("refundStarPayment", { user_id: userId, telegram_payment_charge_id: chargeId })
    },
  }
}

/** Префикс фейкового счёта — клиентский мок узнаёт его и показывает своё «окно оплаты». */
export const DEV_INVOICE_PREFIX = "mock-invoice:"

/**
 * Dev-режим без токена: счёт — строка `mock-invoice:<purchaseId>:<stars>`, сообщения пишутся в лог.
 * Оплату имитирует сервер (см. app.ts), как будто Telegram прислал successful_payment.
 */
export function createDevTelegramApi(log: (msg: string) => void = console.info): TelegramApi & { sent: { chatId: number; text: string }[] } {
  const sent: { chatId: number; text: string }[] = []
  return {
    sent,
    createInvoiceLink: async ({ payload, stars }) => `${DEV_INVOICE_PREFIX}${payload}:${stars}`,
    async answerPreCheckoutQuery() {},
    async sendMessage(chatId, text) {
      sent.push({ chatId, text })
      log(`[dev bot → ${chatId}] ${text}`)
      return true
    },
    getUpdates: async () => [],
    async deleteWebhook() {},
    async refundStarPayment(userId, chargeId) {
      log(`[dev bot] refund ${chargeId} → ${userId}`)
    },
  }
}
