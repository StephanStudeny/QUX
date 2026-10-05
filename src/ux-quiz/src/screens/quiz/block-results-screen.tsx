import { useState } from "react"
import { Link, Navigate, useNavigate } from "react-router-dom"
import flame3d from "@/assets/3d/streak-flame.webp"
import { Icon } from "@/components/icon"
import { ShellLayout } from "@/components/layout/shell-layout"
import { Button } from "@/components/ui/button"
import { GAME } from "@/config/game"
import { useBackButton } from "@/hooks/use-back-button"
import { useT } from "@/i18n"
import { usePlatform } from "@/platform"
import { levelAbove, startNextBlock, SUPER_SIZE } from "@/quiz/engine"
import type { GameState } from "@/state/game-state"
import { useStore } from "@/state/store"

/**
 * 3.6 Итоги блока: верно / лучшая серия / супер, жизни было → стало, подсказки, ошибки → разбор.
 * После супервикторины 3/3 главная кнопка — «Уровень выше» (сразу блок следующего уровня).
 */
export function BlockResultsScreen() {
  const { t, tp } = useT()
  const { state, update } = useStore()
  const platform = usePlatform()
  const navigate = useNavigate()
  const b = state.block

  // Уходим с экрана: переход роутера идёт как transition и отстаёт от обновления прогресса,
  // поэтому редирект «блок уже не в итогах → в квиз» на время ухода отключаем.
  const [leaving, setLeaving] = useState(false)
  const leave = (to: "/" | "/quiz", next: GameState | ((s: GameState) => GameState)) => {
    setLeaving(true)
    navigate(to, { replace: true })
    update(typeof next === "function" ? next : () => next)
  }
  const goHome = () => leave("/", startNextBlock)
  useBackButton(goHome)

  if (b.phase !== "results" && !leaving) return <Navigate to="/quiz" replace />

  // Супервикторина пройдена на 3/3 — главная кнопка повышает уровень (на Сениоре — обычный следующий блок).
  const superPassed = b.superResults.length === SUPER_SIZE && b.superResults.every((r) => r === "correct")
  const upLevel = superPassed ? levelAbove(b.level) : null

  const correct = b.results.filter((r) => r === "correct").length
  const superCorrect = b.superResults.filter((r) => r === "correct").length
  const mistakes = b.wrongIds.length
  const lost = b.results.filter((r) => r === "wrong" || r === "timeout").length + b.superResults.filter((r) => r !== "correct").length

  const kpis = [
    { value: `${correct}/${GAME.blockSize}`, label: t("results.correct") },
    { value: String(b.bestStreak), label: t("results.streak"), flame: true },
    { value: b.superResults.length ? `${superCorrect}/${SUPER_SIZE}` : t("results.superNone"), label: t("results.super") },
  ]

  const breakdown = [
    lost > 0 ? t("results.livesLost", { count: lost }) : null,
    b.superLives > 0 ? t("results.livesSuper", { count: b.superLives }) : null,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <ShellLayout tabBar={false}>
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 font-bold">{t("results.title", { n: b.number })}</h1>
        <p className="text-small text-muted-foreground">{t("results.level", { level: t(`level.${b.level}`) })}</p>
      </header>

      <dl className="flex gap-2">
        {kpis.map((k) => (
          <div key={k.label} className="card-gradient flex min-w-0 flex-1 flex-col-reverse justify-end gap-0.5 p-4">
            <dt className="text-caption text-muted-foreground">{k.label}</dt>
            <dd className="flex items-center gap-1 text-h1 font-bold">
              {k.value}
              {k.flame && <img src={flame3d} alt="" className="size-5 object-contain" />}
            </dd>
          </div>
        ))}
      </dl>

      <section className="card-gradient flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2">
            <span className="min-w-0 flex-1 text-button font-medium">{t("invite.lives")}</span>
            <span className="flex items-center gap-1 text-button font-semibold" aria-label={t("results.livesA11y", { from: b.livesStart, to: state.lives })}>
              {b.livesStart}
              <Icon name="arrow-right" className="size-4" />
              {state.lives}
              <Icon name="heart" className="size-4 text-heart" />
            </span>
          </p>
          {breakdown && <p className="-mt-1 text-caption text-muted-foreground">{breakdown}</p>}
        </div>
        <p className="flex items-center gap-2">
          <span className="min-w-0 flex-1 text-button font-medium">{t("results.hints")}</span>
          <span className="text-button font-semibold text-success">+{b.hintsGained}</span>
        </p>
        {mistakes > 0 ? (
          <Link
            to="/review"
            className="-my-3 flex min-h-11 items-center gap-2 rounded-md py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="min-w-0 flex-1 text-button font-medium">{t("results.mistakes")}</span>
            <span className="text-button font-semibold text-accent-text">{tp("results.review", mistakes)}</span>
            <Icon name="chevron-right" className="size-4 text-accent-text" />
          </Link>
        ) : (
          <p className="flex items-center gap-2">
            <span className="min-w-0 flex-1 text-button font-medium">{t("results.mistakes")}</span>
            <span className="text-button font-semibold text-muted-foreground">0</span>
          </p>
        )}
      </section>

      <div className="mt-auto flex flex-col gap-2">
        <Button
          variant="cta"
          size="cta"
          onClick={() => {
            platform.haptic.impact("medium")
            leave("/quiz", (s) => startNextBlock(s, upLevel ?? undefined))
          }}
        >
          {upLevel ? t("results.levelUp", { level: t(`level.${upLevel}`) }) : t("results.next")}
        </Button>
        <Button variant="outline-cta" size="cta" onClick={goHome}>
          {t("results.home")}
        </Button>
      </div>
    </ShellLayout>
  )
}
