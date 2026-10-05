import star3d from "@/assets/3d/super-star.webp"
import { CenterModal } from "@/components/center-modal"
import { Button } from "@/components/ui/button"
import { LEVELS, type Level } from "@/config/game"
import { useT } from "@/i18n"

/**
 * Уведомление «Уровень пройден» — ЗАГЛУШКА до макета (собрана из CenterModal).
 * Джун / Мидл → предложить уровень выше; Сениор → самые сложные позади, вспомнить азы на Джуне или Мидле.
 * «Отмена» — на главную.
 */
export function LevelDoneModal({
  open,
  level,
  onPick,
  onCancel,
}: {
  open: boolean
  level: Level
  onPick: (l: Level) => void
  onCancel: () => void
}) {
  const { t } = useT()
  const idx = LEVELS.indexOf(level)
  const next = LEVELS[idx + 1] as Level | undefined
  const name = (l: Level) => t(`level.${l}`)

  return (
    <CenterModal open={open} onClose={onCancel} labelledBy="level-done-title" icon={star3d}>
      <h2 id="level-done-title" className="text-h1 font-bold">
        {t("levelDone.title", { level: name(level) })}
      </h2>
      <p className="text-body text-muted-foreground">
        {next ? t("levelDone.text", { next: name(next) }) : t("levelDone.textTop")}
      </p>
      {next ? (
        <Button variant="cta" size="cta" autoFocus onClick={() => onPick(next)}>
          {t("levelDone.goNext", { next: name(next) })}
        </Button>
      ) : (
        <div className="flex w-full gap-2">
          {LEVELS.slice(0, -1).map((l, i) => (
            <Button key={l} variant="cta" size="cta" className="flex-1" autoFocus={i === 0} onClick={() => onPick(l)}>
              {name(l)}
            </Button>
          ))}
        </div>
      )}
      <Button variant="outline-cta" size="cta" onClick={onCancel}>
        {t("levelDone.cancel")}
      </Button>
    </CenterModal>
  )
}
