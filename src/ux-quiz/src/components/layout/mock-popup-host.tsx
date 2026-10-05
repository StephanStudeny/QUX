import { useEffect, useRef, useSyncExternalStore } from "react"
import { useT } from "@/i18n"
import { mockChrome } from "@/platform/mock"
import type { PopupButton } from "@/platform/types"
import { cn } from "@/lib/utils"

/**
 * Имитация нативного попапа Telegram (showPopup / showConfirm) — только в браузере.
 * Вид условный: в Telegram попап рисует клиент и красит его сам.
 */
export function MockPopupHost() {
  const { t } = useT()
  const { popup } = useSyncExternalStore(mockChrome.subscribe, mockChrome.get)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (popup && !d.open) d.showModal()
    if (!popup && d.open) d.close()
  }, [popup])

  const label = (b: PopupButton) =>
    b.text ?? (b.type === "cancel" ? t("popup.cancel") : b.type === "close" ? t("tg.close") : t("popup.ok"))

  const buttons = popup?.buttons?.length ? popup.buttons : [{ id: "close", type: "close" as const }]

  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault()
        mockChrome.answer(null)
      }}
      className="m-auto w-[min(296px,calc(100vw-32px))] rounded-xl bg-[#2b2b2f] p-0 text-[#f5f5f5] shadow-2xl backdrop:bg-black/50"
    >
      {popup && (
        <div>
          <div className="px-5 pt-5 pb-4">
            {popup.title && <p className="mb-1 text-title font-semibold">{popup.title}</p>}
            <p className="text-body">{popup.message}</p>
          </div>
          <div className="flex justify-end gap-1 px-2 pb-2">
            {buttons.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => mockChrome.answer(b.id)}
                className={cn(
                  "h-11 rounded-md px-3 text-body font-semibold text-[#6ab3f3] hover:bg-white/5",
                  b.type === "destructive" && "text-[#ff6b6b]",
                )}
              >
                {label(b)}
              </button>
            ))}
          </div>
        </div>
      )}
    </dialog>
  )
}
