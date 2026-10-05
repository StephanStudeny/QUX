import { forwardRef } from "react"
import heart3d from "@/assets/3d/heart.webp"
import { Icon } from "@/components/icon"
import { useT } from "@/i18n"
import type { Outcome } from "@/state/game-state"
import { cn } from "@/lib/utils"

/** Последние секунды — таймер и заливка краснеют (2.6). */
export const DANGER_MS = 10_000

/** Точки прогресса (R / Progress dot): верно, ошибка, пропуск, текущая, впереди. */
function Dots({ results, total, current }: { results: Outcome[]; total: number; current: number }) {
  const { t } = useT()
  return (
    <ol aria-label={t("quiz.progressA11y", { current: current + 1, total })} className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => {
        const r = results[i]
        return (
          <li
            key={i}
            className={cn(
              "shrink-0 rounded-[7px]",
              i === current && !r ? "size-3.5 bg-foreground shadow-[0_0_6px_0_var(--glow-accent)]" : "size-3",
              r === "correct" && "bg-success",
              (r === "wrong" || r === "timeout") && "bg-destructive",
              r === "skip" && "bg-muted ring-1 ring-muted-foreground ring-inset",
              !r && i !== current && "bg-muted",
            )}
          />
        )
      })}
    </ol>
  )
}

/** Таймер: трек --muted 6 px, заливка-градиент с диагональными полосами и светящимся концом. */
const Timer = forwardRef<HTMLDivElement, { remainingMs: number; totalMs: number }>(function Timer({ remainingMs, totalMs }, ref) {
  const { t } = useT()
  const danger = remainingMs <= DANGER_MS
  const pct = Math.max(0, Math.min(1, remainingMs / totalMs)) * 100
  const sec = Math.ceil(remainingMs / 1000)
  const label = `0:${String(sec).padStart(2, "0")}`
  return (
    <div ref={ref} className="flex items-center gap-2">
      <div
        role="timer"
        aria-label={t("quiz.timerA11y", { sec })}
        className="relative h-1.5 min-w-0 flex-1 rounded-[3px] bg-muted"
      >
        <div
          className={cn(
            "relative h-full overflow-hidden rounded-[3px] bg-gradient-to-r transition-[width] duration-100 ease-linear motion-reduce:transition-none",
            danger ? "from-destructive to-glow-destructive-core" : "from-accent to-glow-accent-core",
          )}
          style={{ width: `${pct}%` }}
        >
          <span
            aria-hidden
            className="absolute inset-0 bg-[repeating-linear-gradient(-45deg,rgb(255_255_255/.08)_0_2px,transparent_2px_7px)]"
          />
        </div>
        {pct > 0 && (
          <span
            aria-hidden
            className={cn(
              "absolute top-0 size-1.5 -translate-x-full rounded-full",
              danger
                ? "bg-[var(--glow-destructive-core)] shadow-[0_0_12px_0_var(--glow-destructive)]"
                : "bg-glow-accent-core shadow-[0_0_12px_0_var(--glow-accent)]",
            )}
            style={{ left: `${pct}%` }}
          />
        )}
      </div>
      <span className={cn("w-7 text-right text-caption font-semibold tabular-nums", danger ? "text-destructive" : "text-foreground")}>
        {label}
      </span>
    </div>
  )
})

/**
 * Шапка игры (2.x / 3.3): жизни «4» (+ «−1» после ошибки), в супервикторине — золотой чип,
 * справа точки прогресса; ниже таймер. Рефы — цели тултипов первой встречи.
 */
export function GameHeader({
  lives,
  lostLife,
  isSuper,
  results,
  total,
  current,
  remainingMs,
  totalMs,
  livesRef,
  timerRef,
}: {
  lives: number
  lostLife: boolean
  isSuper: boolean
  results: Outcome[]
  total: number
  current: number
  remainingMs: number
  totalMs: number
  livesRef?: React.Ref<HTMLDivElement>
  timerRef?: React.Ref<HTMLDivElement>
}) {
  const { t } = useT()
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <div
          ref={livesRef}
          role="img"
          aria-label={t("quiz.livesA11y", { count: lives })}
          className="flex shrink-0 items-center gap-1 rounded-full bg-heart/14 py-1 pr-2.5 pl-1.5"
        >
          <img src={heart3d} alt="" className="size-5 object-contain" />
          <span className="text-h2 leading-[18px] font-bold tabular-nums">{lives}</span>
        </div>
        {lostLife && (
          <span aria-hidden className="text-small font-semibold text-heart">
            −1
          </span>
        )}
        {isSuper && (
          <span className="flex items-center gap-1 rounded-full bg-warning py-[3px] pr-2.5 pl-2 text-small font-semibold text-popover">
            <Icon name="star" className="size-3.5" />
            {t("super.title")}
          </span>
        )}
        <div className="ml-auto">
          <Dots results={results} total={total} current={current} />
        </div>
      </div>
      <Timer ref={timerRef} remainingMs={remainingMs} totalMs={totalMs} />
    </div>
  )
}
