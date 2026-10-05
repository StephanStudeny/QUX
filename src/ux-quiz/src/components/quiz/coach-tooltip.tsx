import { useLayoutEffect, useState, type RefObject } from "react"
import { useT } from "@/i18n"

/**
 * R / Coach tooltip — подсказка первой встречи (4.3–4.5): карточка --popover 240, радиус 12,
 * указатель на цель, «Понятно» --primary. Цель обводится кольцом --primary; затемнения нет.
 * Пока тултип открыт, таймер вопроса на паузе (решает экран).
 */
export function CoachTooltip({
  target,
  text,
  onClose,
}: {
  target: RefObject<HTMLElement | null>
  text: string
  onClose: () => void
}) {
  const { t } = useT()
  const [rect, setRect] = useState<DOMRect | null>(null)

  useLayoutEffect(() => {
    const update = () => setRect(target.current?.getBoundingClientRect() ?? null)
    update()
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
    }
  }, [target])

  if (!rect) return null

  const width = 240
  const gap = 10
  const below = rect.top < window.innerHeight / 2
  const left = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 12)
  const pointerX = Math.min(Math.max(16, rect.left + rect.width / 2 - left - 6), width - 28)

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed z-40 rounded-[14px] ring-2 ring-primary"
        style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 }}
      />
      <div
        role="dialog"
        aria-live="polite"
        aria-label={text}
        className="fixed z-50 animate-in fade-in-0 motion-reduce:animate-none"
        style={{ left, width, ...(below ? { top: rect.bottom + gap } : { bottom: window.innerHeight - rect.top + gap }) }}
      >
        <svg
          aria-hidden
          width="12"
          height="6"
          viewBox="0 0 12 6"
          className="absolute"
          style={{ left: pointerX, ...(below ? { top: -5 } : { bottom: -5, transform: "rotate(180deg)" }) }}
        >
          <path d="M0 6 6 0l6 6" fill="var(--popover)" stroke="var(--border)" />
        </svg>
        <div className="flex flex-col gap-2 rounded-[12px] border border-border bg-popover p-3 text-popover-foreground">
          <p className="text-body">{text}</p>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="-my-3 -mr-2 self-end rounded-md px-2 py-3 text-body font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("quiz.gotIt")}
          </button>
        </div>
      </div>
    </>
  )
}
