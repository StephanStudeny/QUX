import check3d from "@/assets/3d/check.webp"
import wrong3d from "@/assets/3d/result-wrong.webp"
import { useT } from "@/i18n"
import { cn } from "@/lib/utils"

export type TileState = "idle" | "removed" | "correct" | "wrong" | "dim"

/**
 * Варианты 2×2 (AnswerOption): плитки 56, текст по центру, до 2 строк, букв A–D нет.
 * После ответа: выбранный неверный — --destructive с 3D-крестиком, верный — --success с галочкой,
 * остальные приглушены. Убранные подсказкой — 35%.
 */
export function AnswerGrid({
  options,
  states,
  disabled,
  onPick,
}: {
  options: { key: number; text: string }[]
  states: Record<number, TileState>
  disabled: boolean
  onPick: (key: number) => void
}) {
  const { t } = useT()
  return (
    <div role="group" aria-label={t("quiz.answers")} className="grid min-h-[120px] grid-cols-2 gap-2">
      {options.map((o) => {
        const st = states[o.key] ?? "idle"
        const revealed = st === "correct" || st === "wrong"
        return (
          <button
            key={o.key}
            type="button"
            disabled={disabled || st === "removed"}
            onClick={() => onPick(o.key)}
            aria-label={
              st === "correct" ? `${o.text}, ${t("quiz.correctMark")}` : st === "wrong" ? `${o.text}, ${t("quiz.wrongMark")}` : undefined
            }
            className={cn(
              "relative flex h-14 items-center justify-center rounded-lg p-2.5 text-center outline-none transition-[opacity,transform,background-color] duration-200",
              "focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
              st === "idle" && "card-gradient",
              st === "dim" && "card-gradient opacity-50",
              st === "removed" && "bg-gradient-to-b from-gradient-card-from to-gradient-card-to opacity-35",
              st === "correct" && "border-[1.5px] border-success bg-success text-background drop-shadow-[0_0_10px_var(--glow-success)]",
              st === "wrong" && "border-[1.5px] border-destructive bg-destructive text-background drop-shadow-[0_0_10px_var(--glow-destructive)]",
            )}
          >
            <span className={cn("line-clamp-2 text-answer font-medium", !revealed && "text-foreground")}>{o.text}</span>
            {revealed && (
              <img src={st === "correct" ? check3d : wrong3d} alt="" className="absolute -top-2 -right-2 size-6 object-contain" />
            )}
          </button>
        )
      })}
    </div>
  )
}
