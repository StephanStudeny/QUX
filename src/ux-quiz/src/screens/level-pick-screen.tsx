import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ShellLayout } from "@/components/layout/shell-layout"
import { Segmented } from "@/components/segmented"
import { Button } from "@/components/ui/button"
import { GAME, LEVELS, type Level } from "@/config/game"
import { useT } from "@/i18n"
import { usePlatform } from "@/platform"
import { newBlock } from "@/state/game-state"
import { useStore } from "@/state/store"

/**
 * 4.2 Первый запуск — выбор уровня (макет 200:2566): фон с командой, hero ниже картинки; без Tab Bar, «Начать» прижата к низу.
 * По умолчанию Мидл; после «Начать» — сразу первый вопрос (онбординга нет).
 */
export function LevelPickScreen() {
  const { t } = useT()
  const { update } = useStore()
  const platform = usePlatform()
  const navigate = useNavigate()
  const [level, setLevel] = useState<Level>("middle")

  return (
    <ShellLayout tabBar={false} spot="team">
      {/* Отступ 166 при ширине 375 (0,4427 ширины): «QUX» на той же высоте, что на главной (1.1 · v2). */}
      <header className="flex flex-col gap-1 pt-[min(44.27vw,166px)]">
        <h1 className="text-display font-bold">{t("app.name")}</h1>
        <p className="text-body text-muted-foreground">{t("app.tagline")}</p>
      </header>

      <section className="flex flex-col gap-3 pt-2">
        <h2 className="text-h2 font-bold">{t("levelPick.title")}</h2>
        <Segmented
          label={t("levelPick.title")}
          value={level}
          onChange={(l) => {
            platform.haptic.selection()
            setLevel(l)
          }}
          options={LEVELS.map((l) => ({ value: l, label: t(`level.${l}`) }))}
        />
        <p className="text-caption text-muted-foreground">
          {t("levelPick.note", { count: GAME.blockSize, seconds: GAME.questionSeconds })}
        </p>
      </section>

      <Button
        variant="cta"
        size="cta"
        className="mt-auto"
        onClick={() => {
          platform.haptic.impact("medium")
          update((s) => ({ ...s, level, block: newBlock(s.block.number, level, s.lives) }))
          navigate("/quiz", { replace: true })
        }}
      >
        {t("game.start")}
      </Button>
    </ShellLayout>
  )
}
