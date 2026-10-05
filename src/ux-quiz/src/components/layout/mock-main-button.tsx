import { useSyncExternalStore } from "react"
import { mockChrome } from "@/platform/mock"

/**
 * Имитация нижней панели Telegram с MainButton (TG Bottom Bar) — только в браузере.
 * Панель --background, кнопка --primary r12, нижний отступ 24 = safe area.
 */
export function MockMainButton() {
  const { main } = useSyncExternalStore(mockChrome.subscribe, mockChrome.get)
  if (!main) return null
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background px-4 pt-2.5 pb-6">
      <button
        type="button"
        onClick={main.onClick}
        className="mx-auto flex h-12 w-full max-w-[448px] items-center justify-center rounded-[12px] bg-primary text-[15px] leading-5 font-semibold text-primary-foreground shadow-glow-success outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {main.text}
      </button>
    </div>
  )
}
