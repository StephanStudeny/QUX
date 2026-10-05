import { mockInvoiceStars } from "@/api/backend"
import type { Platform, PopupParams } from "./types"

/**
 * Состояние «нативного» хрома в браузере: кнопка Назад в мок-шапке и попап.
 * Мок-компоненты (MockTgHeader, MockPopupHost) подписываются через useSyncExternalStore.
 */
export interface MockChromeState {
  back: (() => void) | null
  main: { text: string; onClick: () => void } | null
  popup: (PopupParams & { resolve: (id: string | null) => void }) | null
}

let state: MockChromeState = { back: null, main: null, popup: null }
const listeners = new Set<() => void>()
const set = (patch: Partial<MockChromeState>) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export const mockChrome = {
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
  get: () => state,
  /** Нажатие кнопки попапа: закрывает его и отдаёт id кнопки (null — закрыт без выбора). */
  answer(id: string | null) {
    state.popup?.resolve(id)
    set({ popup: null })
  },
}

/**
 * Сценарий мока из адреса, для просмотра состояний в браузере:
 * `?fresh` — первый запуск (4.0 → 4.2), `?slow` — долгая загрузка (скелетон 4.1),
 * `?offline` — ошибка сети (4.6). `&noname` — Telegram не отдал имя (спросим при входе).
 * `?demo` — демо-данные из макетов (для проверки экранов). Без параметра — как у настоящего игрока:
 * первый запуск, стартовые жизни и подсказки, дальше всё копится и тратится по-честному (правка Степана 2026-10-04).
 */
export type MockScenario = "real" | "demo" | "fresh" | "slow" | "offline"
const params = new URLSearchParams(window.location.search)
export const mockScenario: MockScenario = params.has("fresh")
  ? "fresh"
  : params.has("slow")
    ? "slow"
    : params.has("offline")
      ? "offline"
      : params.has("demo")
        ? "demo"
        : "real"

/**
 * Демо-состояние для просмотра экранов квиза без прохождения: `?demo=quiz` (середина блока 2.1), `super` (вступление 3.2),
 * `results` (итоги 3.6), `livesout` (3.7), `streak` (4 верных подряд — следующий даст 3.1),
 * `nine` (9 из 10 без ошибок — 10-й верный или «Пропуск» даст «поднимем ставки»), `twowrong` (две ошибки — третья остановит блок).
 */
export const mockDemo = params.get("demo")

// У каждого сценария своё хранилище, чтобы «первый запуск» не затирал демо.
const STORAGE_PREFIX = `ux-quiz:${mockScenario}:${mockDemo ?? ""}:`
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Мок для браузера: localStorage вместо CloudStorage, попапы рисуем сами. */
export function createMockPlatform(): Platform {
  const showPopup = (params: PopupParams) =>
    new Promise<string | null>((resolve) => {
      state.popup?.resolve(null)
      set({ popup: { ...params, resolve } })
    })

  return {
    kind: "browser",
    user: { id: 1, firstName: params.has("noname") ? "" : "Степан", username: "stepan" },
    startParam: null,
    initData: null,
    init() {},

    backButton: {
      show: (onClick) => set({ back: onClick }),
      hide: () => set({ back: null }),
    },
    close: () => console.info("[mock] close mini app"),

    mainButton: {
      show: (text, onClick) => set({ main: { text, onClick } }),
      hide: () => set({ main: null }),
    },

    showPopup,
    showConfirm: async (message) => {
      const id = await showPopup({ message, buttons: [{ id: "cancel", type: "cancel" }, { id: "ok", type: "ok" }] })
      return id === "ok"
    },

    storage: {
      get: async (key) => {
        if (mockScenario === "slow") await delay(2500)
        if (mockScenario === "offline") {
          await delay(600)
          throw new Error("offline")
        }
        try {
          return localStorage.getItem(STORAGE_PREFIX + key)
        } catch {
          return null
        }
      },
      set: async (key, value) => {
        try {
          localStorage.setItem(STORAGE_PREFIX + key, value)
        } catch {
          /* приватный режим — прогресс живёт до перезагрузки */
        }
      },
      remove: async (key) => {
        try {
          localStorage.removeItem(STORAGE_PREFIX + key)
        } catch {
          /* см. выше */
        }
      },
    },

    haptic: {
      impact: () => {},
      notification: () => {},
      selection: () => {},
    },

    // Имитация окна оплаты Telegram Stars: «Оплатить» → paid, «Отмена» → cancelled.
    openInvoice: async (url) => {
      const stars = mockInvoiceStars(url)
      const id = await showPopup({
        title: "Telegram Stars (мок)",
        message: `Оплатить ${stars ?? "?"} ⭐?`,
        buttons: [
          { id: "cancel", type: "cancel" },
          { id: "pay", type: "default", text: "Оплатить" },
        ],
      })
      return id === "pay" ? "paid" : "cancelled"
    },
    openLink: (url) => window.open(url, "_blank", "noopener"),
    shareLink: (url, text) => console.info("[mock] share", url, text),
    requestWriteAccess: async () => true,
  }
}
