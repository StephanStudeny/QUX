import { useEffect, useRef, type ReactNode } from "react"

/**
 * Шторка снизу на нативном <dialog>: фокус-ловушка и Esc из коробки.
 * Затемнение — --background 70%, панель --card со скруглением 24, язычок 36×4.
 * Тап по затемнению закрывает.
 */
export function BottomSheet({
  open,
  onClose,
  labelledBy,
  height,
  children,
}: {
  open: boolean
  onClose: () => void
  labelledBy: string
  /** Фиксированная высота панели из макета (px); ограничивается высотой экрана. */
  height?: number
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      document.documentElement.style.overflow = "hidden"
    }
    if (!open && d.open) d.close()
    return () => {
      document.documentElement.style.overflow = ""
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={height ? { height: `min(${height}px, calc(100dvh - 24px))` } : undefined}
      className="fixed inset-x-0 top-auto bottom-0 m-0 h-auto max-h-[calc(100dvh-24px)] w-full max-w-none overflow-y-auto rounded-t-[24px] border-t border-border bg-card p-0 text-foreground backdrop:bg-background/70 open:animate-in open:slide-in-from-bottom open:duration-300 motion-reduce:open:animate-none"
    >
      <div className="mx-auto flex min-h-full max-w-[480px] flex-col gap-4 px-4 pt-2.5" style={{ paddingBottom: "max(34px, var(--safe-bottom))" }}>
        <div aria-hidden className="mx-auto h-1 w-9 rounded-[2px] bg-muted-foreground" />
        {children}
      </div>
    </dialog>
  )
}
