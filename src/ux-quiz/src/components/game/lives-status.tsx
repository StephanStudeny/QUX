import { useEffect } from "react"
import heart3d from "@/assets/3d/heart.webp"
import { GAME } from "@/config/game"
import { useNow } from "@/hooks/use-now"
import { useT } from "@/i18n"
import { applyRegen, formatCountdown, msToNextLife } from "@/state/lives"
import { useStore } from "@/state/store"

/**
 * Жизни «4 / 20» + «+1 через 42:10» (1.3). `timer={false}` — только пилюля (главная 1.1, правка Степана 2026-10-05).
 * Сверх лимита показываем как есть («23 / 20» — только у старых сохранений); выше порога восстановления таймера нет.
 * Восстановленную жизнь записывает в прогресс, а не только рисует.
 */
export function LivesStatus({ timer = true }: { timer?: boolean }) {
  const { t } = useT()
  const { state, update } = useStore()
  const now = useNow()

  const { lives, anchor } = applyRegen(state.lives, state.livesAnchor, now)
  const nextMs = msToNextLife(lives, anchor, now)

  useEffect(() => {
    if (lives !== state.lives) update((s) => ({ ...s, lives, livesAnchor: anchor }))
  }, [lives, anchor, state.lives, update])

  return (
    <>
      <div
        role="img"
        aria-label={t("status.lives", { count: lives, max: GAME.livesMax })}
        className="flex h-[calc(28px*var(--s))] shrink-0 items-center gap-1.5 rounded-full bg-heart/24 pr-2.5 pl-1.5"
      >
        <img src={heart3d} alt="" className="size-4 object-contain" />
        <span className="text-small font-semibold tabular-nums">
          {lives} / {GAME.livesMax}
        </span>
      </div>
      {timer && nextMs !== null && (
        <p className="min-w-0 truncate text-caption font-medium text-muted-foreground tabular-nums">
          <span aria-hidden>{t("status.regen", { time: formatCountdown(nextMs) })}</span>
          <span className="sr-only">{t("status.regenA11y", { time: formatCountdown(nextMs) })}</span>
        </p>
      )}
    </>
  )
}
