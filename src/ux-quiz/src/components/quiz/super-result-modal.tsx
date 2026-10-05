import rays from "@/assets/3d/rays.webp"
import wrong3d from "@/assets/3d/result-wrong.webp"
import star3d from "@/assets/3d/super-star.webp"
import { Icon } from "@/components/icon"
import { ModalCard } from "@/components/modal-card"
import { Button } from "@/components/ui/button"
import { GAME, type HintType } from "@/config/game"
import { HINT_IMAGES } from "@/config/hints"
import { useT } from "@/i18n"
import type { Question } from "@/quiz/bank"
import type { Outcome } from "@/state/game-state"

/**
 * R / Super result (3.4 «Пройдена» / 3.5 «Почти!»): золото --warning; при неудаче — разбор
 * трёх вопросов: верный — галочка и ответ, ошибка — крестик и ссылка на пояснение.
 */
export function SuperResultModal({
  open,
  passed,
  results,
  questions,
  livesBefore,
  livesAfter,
  burned,
  hint,
  onShowExplanation,
  onDone,
}: {
  open: boolean
  passed: boolean
  results: Outcome[]
  questions: Question[]
  livesBefore: number
  livesAfter: number
  burned: number
  hint: HintType | null
  onShowExplanation: (q: Question) => void
  onDone: () => void
}) {
  const { t } = useT()
  const correct = results.filter((r) => r === "correct").length
  const total = results.length

  return (
    <ModalCard open={open} onClose={onDone} labelledBy="super-result-title" className="rounded-[24px] px-5 py-6">
      {passed && (
        <img
          src={rays}
          alt=""
          aria-hidden
          className="pointer-events-none absolute top-[-54px] left-[-58px] size-[200px] max-w-none"
          style={{
            maskImage: "radial-gradient(ellipse 40px 44px at 100px 100px, #fff 0%, rgb(255 255 255/.35) 65%, transparent 100%)",
          }}
        />
      )}
      <div className="relative flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <img src={passed ? star3d : wrong3d} alt="" className="size-11 shrink-0 object-contain" />
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
            {passed && (
              <span className="flex items-center gap-1 rounded-full bg-warning py-[3px] pr-2.5 pl-2 text-small font-semibold text-popover">
                <Icon name="star" className="size-3.5" />
                {t("super.title")}
              </span>
            )}
            <h2 id="super-result-title" className={passed ? "text-h2 font-bold text-warning" : "text-h1 font-bold text-destructive"}>
              {passed ? t("super.passed") : t("super.almost")}
            </h2>
          </div>
          <span
            className={
              passed
                ? "shrink-0 rounded-full bg-warning/16 px-2.5 py-[3px] text-small font-semibold text-warning"
                : "shrink-0 rounded-full bg-destructive/16 px-2.5 py-[3px] text-small font-semibold text-destructive"
            }
          >
            {correct}/{total}
          </span>
        </div>

        <p className="text-body text-muted-foreground">
          {passed ? t("super.passedText") : t("super.failedText", { correct, total })}
        </p>

        {passed ? (
          <>
            <p className="flex items-center gap-2">
              <span className="min-w-0 flex-1 text-button font-medium">{t("invite.lives")}</span>
              <span className="flex items-center gap-1 text-button font-semibold">
                {livesBefore}
                <Icon name="arrow-right" className="size-4" />
                {livesAfter}
                <Icon name="heart" className="size-4 text-heart" />
              </span>
            </p>
            {hint && (
              <p className="flex items-center gap-2">
                <span className="min-w-0 flex-1 text-button font-medium">{t("super.hint")}</span>
                <span className="flex items-center gap-1.5 text-button font-semibold">
                  <img src={HINT_IMAGES[hint]} alt="" className="size-5 object-contain" />
                  {t("super.hintValue", { name: t(`hint.${hint}`) })}
                </span>
              </p>
            )}
            {burned > 0 && (
              <p className="flex items-center gap-[3px] text-caption text-muted-foreground">
                {t("super.burnedBefore", { max: GAME.livesMax })}
                <Icon name="heart" className="size-3 text-heart" />
                {t("super.burnedAfter", { count: burned })}
              </p>
            )}
          </>
        ) : (
          <>
            <h3 className="text-title font-semibold">{t("super.review")}</h3>
            <ul className="flex flex-col gap-2">
              {questions.map((q, i) =>
                results[i] === "correct" ? (
                  <li key={q.id} className="flex items-center gap-2 text-body">
                    <Icon name="check" className="size-4 shrink-0 text-success" />
                    <span className="min-w-0 flex-1">{q.options[q.correct]}</span>
                  </li>
                ) : (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => onShowExplanation(q)}
                      className="flex min-h-11 w-full items-center gap-2 rounded-md text-left text-body outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Icon name="x" className="size-4 shrink-0 text-destructive" />
                      <span className="min-w-0 flex-1">{t("super.showExplanation", { n: i + 1 })}</span>
                      <Icon name="chevron-right" className="size-4 text-muted-foreground" />
                    </button>
                  </li>
                ),
              )}
            </ul>
          </>
        )}

        <Button variant="cta" size="cta" autoFocus onClick={onDone}>
          {t("super.toResults")}
        </Button>
      </div>
    </ModalCard>
  )
}
