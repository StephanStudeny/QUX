import { Link, useNavigate } from "react-router-dom"
import { StatusRow } from "@/components/game/status-row"
import { Icon } from "@/components/icon"
import { ProgressBar } from "@/components/progress-bar"
import { Segmented } from "@/components/segmented"
import { Button } from "@/components/ui/button"
import { GAME, LEVELS } from "@/config/game"
import { useChangeLevel } from "@/hooks/use-change-level"
import { useT } from "@/i18n"
import { usePlatform } from "@/platform"
import { useStore } from "@/state/store"

/**
 * 1.1 Игра (главная, макет 201:2678). Порядок: жизни → hero → выбор уровня → карточка блока
 * («Уровень · Блок N», подпись, прогресс, CTA) → «Пригласите друга». Уровень общий с Настройками.
 * Выход из блока и закрытие приложения сжигают блок, поэтому здесь он всегда с нуля (решение Степана 2026-10-05).
 * CTA стоит в конце карточки и не закрепляется над Tab Bar.
 */
export function GameScreen() {
  const { t, tp } = useT()
  const { state } = useStore()
  const platform = usePlatform()
  const navigate = useNavigate()
  const changeLevel = useChangeLevel()

  const { number, level } = state.block
  const answered = state.block.results.length

  return (
    <>
      <StatusRow />

      {/* Отступ 108 при ширине 375 (0,288 ширины) — контент уходит ниже, чтобы открыть фон с командой (макет 1.1). */}
      <header className="flex flex-col gap-1 pt-[min(28.8vw,138px)]">
        <h1 className="text-display font-bold">{t("app.name")}</h1>
        <p className="text-body text-muted-foreground">{t("app.tagline")}</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-h2 font-bold">{t("levelPick.title")}</h2>
        <Segmented
          label={t("levelPick.title")}
          value={level}
          onChange={changeLevel}
          options={LEVELS.map((l) => ({ value: l, label: t(`level.${l}`) }))}
        />
        <p className="text-caption text-muted-foreground">
          {t("levelPick.note", { count: GAME.blockSize, seconds: GAME.questionSeconds })}
        </p>
      </section>

      <section aria-labelledby="block-title" className="card-gradient flex flex-col gap-2.5 p-4">
        <h2 id="block-title" className="text-title font-semibold">
          {t("game.blockTitle", { level: t(`level.${level}`), block: number })}
        </h2>
        <p className="text-small text-muted-foreground">{t("game.blockNote")}</p>
        <ProgressBar value={answered} max={GAME.blockSize} label={t("game.progress")} />
        <Button
          variant="cta"
          size="cta"
          onClick={() => {
            platform.haptic.impact("medium")
            navigate("/quiz")
          }}
        >
          {answered > 0 ? t("game.continue") : t("game.start")}
        </Button>
      </section>

      <Link
        to="/invite"
        className="card-gradient flex items-center gap-3 p-4 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring active:bg-white/[0.03]"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-button font-semibold">{t("invite.cardTitle")}</span>
          <span className="text-small text-muted-foreground">
            {tp("invite.cardText", GAME.friendRewardLives, {
              lives: GAME.friendRewardLives,
              hints: GAME.friendRewardHintsPerType,
            })}
          </span>
        </span>
        <Icon name="chevron-right" className="size-4 text-muted-foreground" />
      </Link>
    </>
  )
}
