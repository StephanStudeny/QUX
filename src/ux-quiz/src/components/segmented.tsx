import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Сегмент (уровень, язык): подложка --muted r14 p4, выбранный — --accent r10 со свечением --glow-accent.
 * Сегменты по 40 px высотой; радиогруппа для скринридера.
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  stretch = true,
}: {
  value: T
  options: { value: T; label: ReactNode; a11y?: string }[]
  onChange: (v: T) => void
  label: string
  /** true — сегменты делят ширину поровну; false — по содержимому. */
  stretch?: boolean
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-[14px] bg-muted p-1">
      {options.map((o) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={o.a11y}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex h-10 items-center justify-center gap-1.5 rounded-[10px] px-3 text-body outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              stretch && "min-w-0 flex-1",
              selected
                ? "bg-accent font-semibold text-accent-foreground shadow-[0_4px_12px_0_var(--glow-accent)]"
                : "font-medium text-muted-foreground",
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
