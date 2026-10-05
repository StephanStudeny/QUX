import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ShellLayout } from "@/components/layout/shell-layout"
import { useBackButton } from "@/hooks/use-back-button"
import { useT } from "@/i18n"
import { loadBank, type Question } from "@/quiz/bank"
import { isClosed } from "@/quiz/engine"
import { useStore } from "@/state/store"

/**
 * Разбор ошибок (из 3.6 «Ошибки · разобрать» и 3.7 «Разобрать ошибки»): все незакрытые ошибки уровня.
 * Отдельного макета нет — карточки в стиле R / Result modal: вопрос, верный ответ, пояснение (без источника).
 */
export function ReviewScreen() {
  const { t, lang } = useT()
  const { state } = useStore()
  const navigate = useNavigate()
  const [items, setItems] = useState<Question[] | null>(null)
  useBackButton(() => navigate(-1))

  useEffect(() => {
    let alive = true
    loadBank(state.block.level, lang).then((bank) => {
      if (!alive) return
      // Все незакрытые ошибки уровня (была ошибка, ещё нет 3 верных), а не только текущего блока.
      setItems(bank.filter((q) => q.tier === "regular" && state.progress[q.id]?.wrong && !isClosed(state.progress[q.id])))
    })
    return () => {
      alive = false
    }
  }, [state.block.level, state.progress, lang])

  return (
    <ShellLayout tabBar={false}>
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 font-bold">{t("review.title")}</h1>
        <p className="text-small text-muted-foreground">{t("review.note")}</p>
      </header>
      {items?.length === 0 && <p className="text-body text-muted-foreground">{t("review.empty")}</p>}
      <ol className="flex flex-col gap-3">
        {items?.map((q) => (
          <li key={q.id} className="card-gradient flex flex-col gap-2.5 rounded-[20px] p-4">
            <p className="text-title font-semibold">{q.question}</p>
            <div className="flex flex-col gap-1">
              <p className="text-[11px] leading-[14px] text-muted-foreground">{t("quiz.correctAnswer")}</p>
              <p className="text-title leading-5 font-bold text-success">{q.options[q.correct]}</p>
            </div>
            <p className="text-body">{q.explanation}</p>
          </li>
        ))}
      </ol>
    </ShellLayout>
  )
}
