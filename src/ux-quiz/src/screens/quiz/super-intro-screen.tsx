import { Navigate, useNavigate } from "react-router-dom"
import rays from "@/assets/3d/rays.webp"
import skip3d from "@/assets/3d/hint-skip.webp"
import star3d from "@/assets/3d/super-star.webp"
import { Icon } from "@/components/icon"
import { ShellLayout } from "@/components/layout/shell-layout"
import { Button } from "@/components/ui/button"
import { GAME } from "@/config/game"
import { useBackButton } from "@/hooks/use-back-button"
import { useT } from "@/i18n"
import { usePlatform } from "@/platform"
import { SUPER_SIZE } from "@/quiz/engine"
import { useStore } from "@/state/store"

/** 3.2 Супервикторина — вступление: золотая звезда с лучами, условия, «Начать». */
export function SuperIntroScreen() {
  const { t } = useT()
  const { state, update } = useStore()
  const platform = usePlatform()
  const navigate = useNavigate()
  useBackButton(() => navigate("/", { replace: true }))

  if (state.block.phase !== "super-intro") return <Navigate to="/quiz" replace />

  return (
    <ShellLayout tabBar={false} spot="gold">
      <section className="flex flex-col items-center gap-1.5 pt-4 text-center">
        <div className="relative size-[120px]">
          <img
            src={rays}
            alt=""
            aria-hidden
            className="pointer-events-none absolute top-[-70px] left-[-70px] size-[260px] max-w-none"
            style={{
              maskImage: "radial-gradient(ellipse 130px 74px at 50% 50%, #fff 0%, rgb(255 255 255/.9) 30%, rgb(255 255 255/.35) 65%, transparent 100%)",
            }}
          />
          <img src={star3d} alt="" className="relative size-full object-contain" />
        </div>
        <h1 className="text-display font-bold">{t("super.title")}</h1>
        <p className="text-title font-semibold text-muted-foreground">
          {t("super.subtitle", { count: SUPER_SIZE, level: t(`level.${state.block.level}`) })}
        </p>
        <p className="max-w-[300px] text-body text-muted-foreground">
          {t("super.reward", { count: SUPER_SIZE, lives: GAME.superRewardLives })}
        </p>
      </section>

      <ul className="card-gradient flex flex-col gap-3 p-4">
        <li className="flex items-start gap-2.5 text-body">
          <Icon name="timer" className="size-5 shrink-0 text-warning" />
          {t("super.rule.time", { sec: GAME.questionSeconds })}
        </li>
        <li className="flex items-start gap-2.5 text-body">
          <Icon name="heart" className="size-5 shrink-0 text-heart" />
          <span className="flex items-center gap-[3px]">
            {t("super.rule.lifeBefore")}
            <Icon name="heart" className="size-3.5 text-heart" />
            {t("super.rule.lifeAfter")}
          </span>
        </li>
        <li className="flex items-start gap-2.5 text-body">
          <img src={skip3d} alt="" className="size-5 shrink-0 object-contain" />
          {t("super.rule.hints", { count: SUPER_SIZE })}
        </li>
      </ul>

      <Button
        variant="cta"
        size="cta"
        className="mt-auto"
        onClick={() => {
          platform.haptic.impact("medium")
          update((s) => ({ ...s, block: { ...s.block, phase: "super" } }))
          navigate("/quiz", { replace: true })
        }}
      >
        {t("game.start")}
      </Button>
    </ShellLayout>
  )
}
