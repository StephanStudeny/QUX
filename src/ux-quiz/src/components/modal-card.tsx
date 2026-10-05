import { useEffect, useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Модальная карточка по центру на нативном <dialog> (R / Result modal, R / Super result):
 * фон экрана размыт 12 px и затемнён --background 50%. Esc → onClose.
 */
export function ModalCard({
  open,
  onClose,
  labelledBy,
  className,
  children,
}: {
  open: boolean
  onClose: () => void
  labelledBy: string
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      className={cn(
        "card-gradient relative m-auto w-[min(343px,calc(100vw-24px))] overflow-hidden rounded-[20px] p-4 text-foreground",
        "backdrop:bg-background/50 backdrop:backdrop-blur-[12px]",
        "open:animate-in open:fade-in-0 open:zoom-in-95 open:duration-200 motion-reduce:open:animate-none",
        className,
      )}
    >
      {children}
    </dialog>
  )
}
