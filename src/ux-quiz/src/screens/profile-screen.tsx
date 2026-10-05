import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import heart3d from "@/assets/3d/heart.webp"
import { Avatar } from "@/components/avatar"
import { Icon } from "@/components/icon"
import { AvatarSheet } from "@/components/profile/avatar-sheet"
import { NicknameModal } from "@/components/profile/nickname-modal"
import { ProgressBar } from "@/components/progress-bar"
import { Button } from "@/components/ui/button"
import { GAME, LEVELS, type Level } from "@/config/game"
import { useT } from "@/i18n"
import { usePlatform } from "@/platform"
import { loadBank } from "@/quiz/bank"
import { closedCount } from "@/quiz/engine"
import { useStore } from "@/state/store"

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0)

/** Сколько обычных вопросов закрыто на каждом уровне и сколько их всего (банки грузятся лениво). */
function useLevelProgress(progress: Record<string, unknown>) {
  const [counts, setCounts] = useState<Record<Level, { closed: number; total: number }> | null>(null)
  useEffect(() => {
    let alive = true
    Promise.all(LEVELS.map((l) => loadBank(l))).then((banks) => {
      if (!alive) return
      const out = {} as Record<Level, { closed: number; total: number }>
      LEVELS.forEach((l, i) => {
        const bank = banks[i]
        out[l] = { closed: closedCount(bank, progress as never), total: bank.filter((q) => q.tier === "regular").length }
      })
      setCounts(out)
    })
    return () => {
      alive = false
    }
  }, [progress])
  return counts
}

/**
 * 1.2 Профиль: тап по аватару — выбор аватара (1.6), «Сменить никнейм», статистика,
 * прохождение уровней (закрытые вопросы из всех обычных), сброс прогресса, «Пригласить друга» → 1.5.
 */
export function ProfileScreen() {
  const { t } = useT()
  const { state, update } = useStore()
  const platform = usePlatform()
  const navigate = useNavigate()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [nickOpen, setNickOpen] = useState(false)
  const levels = useLevelProgress(state.progress)

  const { byLevel, bestStreak, superPlayed, superPassed } = state.stats
  const answered = LEVELS.reduce((s, l) => s + byLevel[l].answered, 0)
  const correct = LEVELS.reduce((s, l) => s + byLevel[l].correct, 0)
  const superLives = superPassed * GAME.superRewardLives
  const name = state.nickname ?? platform.user?.firstName ?? ""

  const kpis = [
    { label: t("profile.kpi.answered"), value: String(answered) },
    { label: t("profile.kpi.correct"), value: `${pct(correct, answered)}%` },
    { label: t("profile.kpi.streak"), value: String(bestStreak) },
  ]

  return (
    <>
      {/* Шапка профиля (макет 1.2): аватар слева, справа — круглая кнопка настроек; имя и «Сменить никнейм» под аватаром. */}
      <section className="flex flex-col gap-4 pl-0.5">
        <div className="flex items-start justify-between">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label={t("profile.changeAvatar")}
            className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] motion-reduce:active:scale-100"
          >
            <Avatar id={state.avatar} photoUrl={platform.user?.photoUrl} className="size-[72px] shadow-[0_0_0_2px_var(--accent)]" />
          </button>
          <button
            type="button"
            onClick={() => navigate("/settings")}
            aria-label={t("settings.title")}
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-primary text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96] motion-reduce:active:scale-100"
          >
            <Icon name="settings" className="size-8" />
          </button>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate text-h2 font-bold">{name}</h1>
          <button
            type="button"
            onClick={() => setNickOpen(true)}
            className="-my-[13px] flex items-center gap-0.5 self-start rounded-md py-[13px] text-small font-medium text-accent-text outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("profile.changeNickname")}
            <Icon name="chevron-right" className="size-3.5" />
          </button>
        </div>
      </section>

      <h2 className="text-h1 font-bold">{t("profile.stats")}</h2>

      <dl className="flex gap-2">
        {kpis.map((k) => (
          <div key={k.label} className="card-gradient flex min-w-0 flex-1 flex-col-reverse justify-end gap-0.5 p-4">
            <dd className="text-h1 font-bold">{k.value}</dd>
            <dt className="truncate text-caption text-muted-foreground">{k.label}</dt>
          </div>
        ))}
      </dl>


      <section aria-labelledby="by-level" className="card-gradient flex flex-col gap-2 p-4">
        <h3 id="by-level" className="text-button font-semibold">
          {t("profile.byLevel")}
        </h3>
        {LEVELS.map((level) => {
          const c = levels?.[level]
          const p = c ? pct(c.closed, c.total) : 0
          return (
            <div key={level} className="flex flex-col gap-2">
              <p className="flex gap-2">
                <span className="min-w-0 flex-1 text-answer font-medium">{t(`level.${level}`)}</span>
                <span className="shrink-0 text-small text-muted-foreground tabular-nums">
                  {c ? t("profile.levelLine", { pct: p, done: c.closed, total: c.total }) : " "}
                </span>
              </p>
              <ProgressBar value={p} max={100} label={t(`level.${level}`)} />
            </div>
          )
        })}
      </section>

      <Button
        variant="cta"
        size="cta"
        onClick={() => {
          platform.haptic.impact("medium")
          navigate("/quiz")
        }}
      >
        {state.block.results.length > 0 ? t("profile.continue") : t("game.start")}
      </Button>

      <section className="card-gradient flex items-center gap-3 p-4">
        <img src={heart3d} alt="" className="size-8 object-contain" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="text-button font-semibold">{t("profile.super")}</h3>
          <p className="flex items-center gap-1 text-small text-muted-foreground">
            <span aria-hidden>{t("profile.superLine", { passed: superPassed, played: superPlayed, lives: superLives })}</span>
            <Icon name="heart" className="size-3.5 text-heart" />
            <span className="sr-only">
              {t("profile.superLineA11y", { passed: superPassed, played: superPlayed, lives: superLives })}
            </span>
          </p>
        </div>
      </section>

      <Link
        to="/invite"
        className="card-gradient flex items-center gap-3 p-4 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring active:bg-white/[0.03]"
      >
        <span className="min-w-0 flex-1 text-button font-medium">{t("profile.invite")}</span>
        <Icon name="chevron-right" className="size-4 text-muted-foreground" />
      </Link>

      <AvatarSheet
        open={sheetOpen}
        value={state.avatar}
        onClose={() => setSheetOpen(false)}
        onSave={(id) => {
          update((s) => ({ ...s, avatar: id }))
          setSheetOpen(false)
        }}
      />

      <NicknameModal
        open={nickOpen}
        value={name}
        onCancel={() => setNickOpen(false)}
        onSave={(nick) => {
          update((s) => ({ ...s, nickname: nick }))
          platform.haptic.notification("success")
          setNickOpen(false)
        }}
      />
    </>
  )
}
