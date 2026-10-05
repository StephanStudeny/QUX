import correct3d from "@/assets/3d/result-correct.webp"
import timeout3d from "@/assets/3d/result-timeout.webp"
import wrong3d from "@/assets/3d/result-wrong.webp"
import rays from "@/assets/icons/result-rays.svg"
import { ModalCard } from "@/components/modal-card"
import { Button } from "@/components/ui/button"
import { useT } from "@/i18n"
import type { Outcome } from "@/state/game-state"
import { cn } from "@/lib/utils"

const VIEW = {
  correct: { icon: correct3d, title: "quiz.result.correct", color: "text-success" },
  wrong: { icon: wrong3d, title: "quiz.result.wrong", color: "text-destructive" },
  timeout: { icon: timeout3d, title: "quiz.result.timeout", color: "text-warning" },
} as const

/**
 * R / Result modal (2.3+ / 2.4+ / 2.5+): иконка 44 + заголовок 24, «Верный ответ», пояснение
 * и «Дальше». После верного — чип «Серия N». Источников в квизе нет — они на отдельной странице.
 */
export function ResultModal({
  open,
  outcome,
  answer,
  explanation,
  streak,
  onNext,
}: {
  open: boolean
  outcome: Exclude<Outcome, "skip">
  answer: string
  explanation: string
  streak: number
  onNext: () => void
}) {
  const { t } = useT()
  const v = VIEW[outcome]
  return (
    <ModalCard open={open} onClose={onNext} labelledBy="result-title">
      <img src={rays} alt="" aria-hidden className="pointer-events-none absolute top-px left-px size-[74px]" />
      <div className="relative flex flex-col gap-2.5">
        <div className="flex items-center gap-4">
          <img src={v.icon} alt="" className="size-11 shrink-0 object-contain" />
          <h2 id="result-title" className={cn("min-w-0 flex-1 text-h1 leading-6 font-bold", v.color)}>
            {t(v.title)}
          </h2>
          {outcome === "correct" && streak > 1 && (
            <span className="shrink-0 rounded-full bg-primary px-2.5 py-[3px] text-small font-semibold text-primary-foreground">
              {t("quiz.streakChip", { count: streak })}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[11px] leading-[14px] text-muted-foreground">{t("quiz.correctAnswer")}</p>
          <p className="text-title leading-5 font-bold">{answer}</p>
        </div>
        <p className="pb-1 text-body">{explanation}</p>
        <Button variant="cta" size="cta" className="rounded-[12px]" autoFocus onClick={onNext}>
          {t("quiz.next")}
        </Button>
      </div>
    </ModalCard>
  )
}
