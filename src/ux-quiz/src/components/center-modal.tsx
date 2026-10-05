import { useEffect, useRef, type ReactNode } from "react"
import rays from "@/assets/3d/rays.webp"
import { cn } from "@/lib/utils"

/**
 * Модалка по центру (1.5b, R / Result modal): карточка-градиент r24, px20 py24, ширина 343 (на 320 — 296).
 * Сверху — 3D-иконка 72 с «лучами» под ней: лучи гаснут к краю радиальной маской (без видимых границ).
 * Затемнение --background 50%. Прозрачность лучей (14%) уже в PNG. Esc вызывает onClose.
 */
export function CenterModal({
  open,
  onClose,
  labelledBy,
  icon,
  raysOpacity = 1,
  children,
}: {
  open: boolean
  onClose: () => void
  labelledBy: string
  icon: string
  raysOpacity?: number
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
        "card-gradient m-auto w-[min(343px,calc(100vw-24px))] overflow-hidden rounded-[24px] p-0 text-foreground backdrop:bg-background/50",
        "open:animate-in open:fade-in-0 open:zoom-in-95 open:duration-200 motion-reduce:open:animate-none",
      )}
    >
      <div className="flex flex-col items-center gap-3 px-5 py-6 text-center">
        <div className="relative size-[72px]">
          <img
            src={rays}
            alt=""
            aria-hidden
            className="pointer-events-none absolute top-[-64px] left-[-64px] size-[200px] max-w-none"
            style={{
              opacity: raysOpacity,
              maskImage:
                "radial-gradient(ellipse 100px 59px at 50% 50%, #fff 0%, rgb(255 255 255 / .9) 30%, rgb(255 255 255 / .35) 65%, transparent 100%)",
            }}
          />
          <img src={icon} alt="" className="relative size-full object-contain" />
        </div>
        {children}
      </div>
    </dialog>
  )
}
