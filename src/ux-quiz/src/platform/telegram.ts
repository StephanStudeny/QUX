import type { InvoiceStatus, Platform, PopupParams } from "./types"

/** Минимальные типы Telegram.WebApp — только то, чем пользуемся. */
interface TgWebApp {
  initData: string
  initDataUnsafe: {
    user?: { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string; language_code?: string }
    start_param?: string
  }
  ready(): void
  expand(): void
  close(): void
  disableVerticalSwipes?(): void
  setHeaderColor(color: string): void
  setBackgroundColor(color: string): void
  setBottomBarColor?(color: string): void
  isVersionAtLeast(v: string): boolean
  BackButton: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void }
  MainButton: {
    setParams(p: { text?: string; color?: string; text_color?: string; is_visible?: boolean; has_shine_effect?: boolean }): void
    onClick(cb: () => void): void
    offClick(cb: () => void): void
  }
  showPopup(params: { title?: string; message: string; buttons?: PopupParams["buttons"] }, cb: (id: string) => void): void
  showConfirm(message: string, cb: (ok: boolean) => void): void
  CloudStorage: {
    getItem(key: string, cb: (err: string | null, value?: string) => void): void
    setItem(key: string, value: string, cb?: (err: string | null) => void): void
    removeItem(key: string, cb?: (err: string | null) => void): void
  }
  HapticFeedback: {
    impactOccurred(style: string): void
    notificationOccurred(type: string): void
    selectionChanged(): void
  }
  openInvoice(url: string, cb: (status: InvoiceStatus) => void): void
  requestWriteAccess?(cb: (allowed: boolean) => void): void
  openTelegramLink(url: string): void
  openLink(url: string): void
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp }
  }
}

/** WebApp внутри Telegram: SDK загружен и initData непустой. */
export function getTelegramWebApp(): TgWebApp | null {
  const app = window.Telegram?.WebApp
  return app && app.initData ? app : null
}

export function createTelegramPlatform(app: TgWebApp): Platform {
  let backHandler: (() => void) | null = null
  let mainHandler: (() => void) | null = null
  const u = app.initDataUnsafe.user

  return {
    kind: "telegram",
    user: u
      ? { id: u.id, firstName: u.first_name, lastName: u.last_name, username: u.username, photoUrl: u.photo_url, languageCode: u.language_code }
      : null,
    startParam: app.initDataUnsafe.start_param ?? null,
    initData: app.initData,

    init(colors) {
      app.ready()
      app.expand()
      app.disableVerticalSwipes?.()
      app.setHeaderColor(colors.header)
      app.setBackgroundColor(colors.background)
      app.setBottomBarColor?.(colors.bottomBar)
    },

    backButton: {
      show(onClick) {
        if (backHandler) app.BackButton.offClick(backHandler)
        backHandler = onClick
        app.BackButton.onClick(onClick)
        app.BackButton.show()
      },
      hide() {
        if (backHandler) app.BackButton.offClick(backHandler)
        backHandler = null
        app.BackButton.hide()
      },
    },
    close: () => app.close(),

    mainButton: {
      show(text, onClick) {
        if (mainHandler) app.MainButton.offClick(mainHandler)
        mainHandler = onClick
        app.MainButton.onClick(onClick)
        app.MainButton.setParams({ text, color: "#c6f432", text_color: "#151028", is_visible: true })
      },
      hide() {
        if (mainHandler) app.MainButton.offClick(mainHandler)
        mainHandler = null
        app.MainButton.setParams({ is_visible: false })
      },
    },

    showPopup: (params) => new Promise((resolve) => app.showPopup(params, (id) => resolve(id || null))),
    showConfirm: (message) => new Promise((resolve) => app.showConfirm(message, resolve)),

    storage: {
      get: (key) =>
        new Promise((resolve, reject) =>
          app.CloudStorage.getItem(key, (err, value) => (err ? reject(new Error(err)) : resolve(value || null))),
        ),
      set: (key, value) =>
        new Promise((resolve, reject) => app.CloudStorage.setItem(key, value, (err) => (err ? reject(new Error(err)) : resolve()))),
      remove: (key) =>
        new Promise((resolve, reject) => app.CloudStorage.removeItem(key, (err) => (err ? reject(new Error(err)) : resolve()))),
    },

    haptic: {
      impact: (style = "light") => app.HapticFeedback.impactOccurred(style),
      notification: (type) => app.HapticFeedback.notificationOccurred(type),
      selection: () => app.HapticFeedback.selectionChanged(),
    },

    openInvoice: (url) => new Promise((resolve) => app.openInvoice(url, resolve)),
    openLink: (url) => (url.startsWith("https://t.me/") ? app.openTelegramLink(url) : app.openLink(url)),
    shareLink: (url, text) =>
      app.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`),
    // Старые клиенты (Bot API < 6.9) метода не знают — писать бот сможет, только если игрок сам нажмёт /start.
    requestWriteAccess: () =>
      new Promise((resolve) => (app.requestWriteAccess && app.isVersionAtLeast("6.9") ? app.requestWriteAccess(resolve) : resolve(false))),
  }
}
