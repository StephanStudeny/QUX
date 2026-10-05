import { useNavigate } from "react-router-dom"
import heart3d from "@/assets/3d/heart.webp"
import { Icon } from "@/components/icon"
import { ShellLayout } from "@/components/layout/shell-layout"
import { Button } from "@/components/ui/button"
import { GAME } from "@/config/game"
import { useBackButton } from "@/hooks/use-back-button"
import { useNow } from "@/hooks/use-now"
import { useT } from "@/i18n"
import { applyRegen, formatCountdown, msToNextLife } from "@/state/lives"
import { useStore } from "@/state/store"

/**
 * 3.7 Жизни закончились: 3D-сердце 40% + «0», обратный отсчёт до новой жизни.
 * Когда жизнь восстановилась, главная кнопка становится «Продолжить».
 */
export function LivesOutScreen() {
  const { t } = useT()
  const { state } = useStore()
  const navigate = useNavigate()
  const now = useNow()
  useBackButton(() => navigate("/", { replace: true }))

  const { lives, anchor } = applyRegen(state.lives, state.livesAnchor, now)
  const next = msToNextLife(lives, anchor, now)

  return (
    <ShellLayout tabBar={false}>
      <section aria-live="polite" className="my-auto flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-1">
          <img src={heart3d} alt="" className="size-24 object-contain opacity-40" />
          <span className="text-display font-bold tabular-nums">{lives}</span>
        </div>
        <h1 className="text-h1 font-bold">{lives > 0 ? t("livesOut.restored") : t("livesOut.title")}</h1>
        {next !== null && lives === 0 && (
          <>
            <p className="text-small text-muted-foreground">{t("livesOut.next")}</p>
            <p className="text-display font-bold tabular-nums">{formatCountdown(next)}</p>
          </>
        )}
        <p className="flex items-center gap-[3px] text-body text-muted-foreground">
          {t("livesOut.regen", { cap: GAME.livesRegenCap })}
          <Icon name="heart" className="size-3.5 text-heart" />.
        </p>
      </section>

      <div className="flex flex-col gap-2">
        {lives > 0 ? (
          <Button variant="cta" size="cta" onClick={() => navigate("/quiz", { replace: true })}>
            {t("game.continue")}
          </Button>
        ) : (
          <Button variant="cta" size="cta" onClick={() => navigate("/boost")}>
            {t("livesOut.buy")}
          </Button>
        )}
        <Button variant="outline-cta" size="cta" onClick={() => navigate("/review")}>
          {t("livesOut.review")}
        </Button>
      </div>
    </ShellLayout>
  )
}
