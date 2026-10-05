import type { LifePack } from "@/config/game"
import type { Platform } from "@/platform/types"
import type { Friend } from "@/state/game-state"

/**
 * Клиент бэкенда (src/ux-quiz-server): инвойсы Stars, рефералы, награды, уведомления.
 * Адрес — VITE_API_URL. Без него: в браузере мок с задержкой (весь путь оплаты виден без сервера),
 * в Telegram покупки и награды недоступны — начислять без сервера нельзя.
 */
export class BackendUnavailableError extends Error {
  constructor() {
    super("backend is not connected")
  }
}

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? ""
export const backendEnabled = () => API_URL !== ""

const MOCK_PREFIX = "mock-invoice:"
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Telegram — подпись initData; браузер с локальным сервером в dev-режиме — `dev <id>`. */
function authHeader(platform: Platform): string {
  if (platform.initData) return `tma ${platform.initData}`
  if (platform.kind === "browser" && platform.user) return `dev ${platform.user.id}`
  throw new BackendUnavailableError()
}

async function api<T>(platform: Platform, path: string, body?: object, method = "POST"): Promise<T> {
  if (!API_URL) throw new BackendUnavailableError()
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { authorization: authHeader(platform), "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${path}: ${res.status}`)
  return (await res.json()) as T
}

export interface Grant {
  purchaseId: string
  packId: LifePack["id"]
}

/** Запуск: регистрирует игрока (и реферала), отдаёт неполученные покупки и друзей. */
export const startSession = (platform: Platform) =>
  api<{ grants: Grant[]; friends: Friend[] }>(platform, "/api/session", { startParam: platform.startParam })

/** Свежий список друзей — прогресс друга меняется, пока экран 1.5 открыт не впервые. */
export const fetchFriends = (platform: Platform) => api<{ friends: Friend[] }>(platform, "/api/friends", undefined, "GET")

export interface Invoice {
  url: string
  /** null — локальный мок без сервера. */
  purchaseId: string | null
}

/** Ссылка на инвойс Telegram Stars для пакета. Её создаёт сервер через Bot API createInvoiceLink. */
export async function createStarsInvoice(pack: LifePack, platform: Platform): Promise<Invoice> {
  if (!API_URL) {
    if (platform.kind === "browser") return { url: `${MOCK_PREFIX}${pack.id}:${pack.stars}`, purchaseId: null }
    throw new BackendUnavailableError()
  }
  const r = await api<{ purchaseId: string; invoiceUrl: string }>(platform, "/api/invoices", { packId: pack.id })
  return { url: r.invoiceUrl, purchaseId: r.purchaseId }
}

/** Сколько звёзд в мок-инвойсе — для имитации окна оплаты в браузере. */
export const mockInvoiceStars = (url: string) => (url.startsWith(MOCK_PREFIX) ? Number(url.split(":").pop()) : null)

type ClaimStatus = "claimed" | "already" | "pending"

/** Забрать покупку на сервере: «claimed» приходит ровно один раз — только тогда начисляем. */
export const claimPurchase = (platform: Platform, purchaseId: string) =>
  api<{ status: ClaimStatus; packId: LifePack["id"] }>(platform, `/api/purchases/${purchaseId}/claim`)

/**
 * Подтверждение оплаты: сервер получил successful_payment от Telegram и отдал покупку.
 * Статус «paid» из openInvoice сам по себе не доказательство. Telegram присылает оплату
 * с задержкой — ждём до ~15 с; не дождались — покупка придёт при следующем запуске (grants).
 */
export async function confirmStarsPayment(invoice: Invoice, platform: Platform): Promise<boolean> {
  if (!invoice.purchaseId) {
    await delay(1200)
    return true
  }
  for (let i = 0; i < 10; i++) {
    const { status } = await claimPurchase(platform, invoice.purchaseId)
    if (status === "claimed") return true
    if (status === "already") return false
    await delay(1500)
  }
  return false
}

/** Награда за друга: сервер проверяет, что друг прошёл первый блок и награда ещё не забрана. */
export async function claimFriendReward(platform: Platform, friendId: string): Promise<boolean> {
  try {
    await api(platform, `/api/friends/${encodeURIComponent(friendId)}/claim`)
    return true
  } catch {
    return false
  }
}

/** Сколько вопросов первого блока пройдено — пригласивший видит «прошёл N из 10». */
export const reportProgress = (platform: Platform, firstBlock: number) => api(platform, "/api/progress", { firstBlock })

/** Состояние жизней для уведомления «Жизнь восстановилась». */
export const reportLives = (platform: Platform, p: { lives: number; anchor: number; notify: boolean }) => api(platform, "/api/lives", p)
