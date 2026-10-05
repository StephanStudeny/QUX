/**
 * Слой-адаптер платформы. Экраны знают только этот интерфейс — так приложение
 * сможет выйти из Telegram в браузер или Android без переписывания UI.
 */

export interface PlatformUser {
  id: number
  firstName: string
  lastName?: string
  username?: string
  photoUrl?: string
  languageCode?: string
}

export interface PopupButton {
  id: string
  type?: "default" | "ok" | "close" | "cancel" | "destructive"
  text?: string
}

/** Нативный попап: заголовок ≤ 64 символов, текст ≤ 256, 1–3 кнопки (ограничения Telegram). */
export interface PopupParams {
  title?: string
  message: string
  buttons?: PopupButton[]
}

export type InvoiceStatus = "paid" | "cancelled" | "failed" | "pending"

export interface Platform {
  /** `telegram` — внутри Telegram, `browser` — мок для разработки и веб-версии. */
  kind: "telegram" | "browser"
  /** ready + expand + запрет свайпа вниз + цвета шапки и фона. */
  init(colors: { header: string; background: string; bottomBar: string }): void
  user: PlatformUser | null
  /** Стартовый параметр (реферальный код из ссылки t.me/bot/app?startapp=…). */
  startParam: string | null
  /** Подписанные данные запуска Telegram — для входа на бэкенд. В браузере null. */
  initData: string | null

  backButton: {
    show(onClick: () => void): void
    hide(): void
  }
  close(): void

  /**
   * Нативная MainButton нижней панели Telegram (квиз: «Дальше»). Цвет — --primary,
   * текст — --primary-foreground; в браузере мок рисует похожую панель.
   */
  mainButton: {
    show(text: string, onClick: () => void): void
    hide(): void
  }

  showPopup(params: PopupParams): Promise<string | null>
  showConfirm(message: string): Promise<boolean>

  storage: {
    get(key: string): Promise<string | null>
    set(key: string, value: string): Promise<void>
    remove(key: string): Promise<void>
  }

  haptic: {
    impact(style?: "light" | "medium" | "heavy" | "rigid" | "soft"): void
    notification(type: "error" | "success" | "warning"): void
    selection(): void
  }

  /** Оплата в Telegram Stars по ссылке на инвойс, которую выдаёт бэкенд. */
  openInvoice(url: string): Promise<InvoiceStatus>
  /** Открыть ссылку: t.me — внутри Telegram, остальное — во внешнем браузере. */
  openLink(url: string): void
  /** Поделиться ссылкой-приглашением через выбор чата. */
  shareLink(url: string, text: string): void
  /** Разрешение боту писать игроку (уведомление о новой жизни). true — разрешил или уже было. */
  requestWriteAccess(): Promise<boolean>
}
