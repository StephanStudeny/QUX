import { cn } from "@/lib/utils"

/** Прогресс 6 px: трек --muted, заливка — градиент --accent → --glow-accent-core. */
export function ProgressBar({
  value,
  max,
  label,
  className,
}: {
  value: number
  max: number
  label: string
  className?: string
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("h-1.5 overflow-hidden rounded-[3px] bg-muted", className)}
    >
      <div className="h-full rounded-[3px] bg-gradient-to-r from-accent to-glow-accent-core" style={{ width: `${pct}%` }} />
    </div>
  )
}
