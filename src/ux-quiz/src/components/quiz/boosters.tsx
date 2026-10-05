import type { Ref } from "react"
import { HINT_TYPES, type HintType } from "@/config/game"
import { HINT_IMAGES } from "@/config/hints"
import { useT } from "@/i18n"
import { cn } from "@/lib/utils"

/**
 * Бустеры квиза (R / Booster): плитки 56, 3D-иконка слева, счётчик 20 Bold, без подписей.
 * Пусто или уже применён на этом вопросе — иконка 40%, счётчик --muted-foreground.
 */
export function Boosters({
  counts,
  used,
  disabled,
  onUse,
  firstRef,
}: {
  counts: Record<HintType, number>
  used: HintType[]
  disabled: boolean
  onUse: (h: HintType) => void
  firstRef?: Ref<HTMLButtonElement>
}) {
  const { t } = useT()
  return (
    <div role="group" aria-label={t("quiz.hints")} className="flex gap-3">
      {HINT_TYPES.map((h, i) => {
        const empty = counts[h] <= 0 || used.includes(h)
        return (
          <button
            key={h}
            ref={i === 0 ? firstRef : undefined}
            type="button"
            disabled={disabled || empty}
            onClick={() => onUse(h)}
            aria-label={t("quiz.boosterA11y", { name: t(`hint.${h}`), count: counts[h] })}
            className="card-gradient flex h-14 min-w-0 flex-1 items-center gap-1 rounded-lg p-2 outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] disabled:active:scale-100 motion-reduce:active:scale-100"
          >
            <img
              src={HINT_IMAGES[h]}
              alt=""
              className={cn("shrink-0 object-contain", h === "eraser" ? "size-8" : "size-10", empty && "opacity-40")}
            />
            <span className={cn("flex-1 text-center text-h2 leading-6 font-bold tabular-nums", empty && "text-muted-foreground")}>
              {counts[h]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
