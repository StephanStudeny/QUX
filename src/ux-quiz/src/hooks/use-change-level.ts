import type { Level } from "@/config/game"
import { useT } from "@/i18n"
import { usePlatform } from "@/platform"
import { newBlock } from "@/state/game-state"
import { useStore } from "@/state/store"

/**
 * Смена уровня — одна на главную и Настройки (уровень общий, правка Степана 2026-10-05):
 * блок сразу начинается заново на выбранном уровне. Блок уже начат — сначала попап,
 * чтобы случайный тап не стёр прогресс блока.
 */
export function useChangeLevel() {
  const { t } = useT()
  const { state, update } = useStore()
  const platform = usePlatform()

  return async (l: Level) => {
    if (l === state.block.level) return
    platform.haptic.selection()
    if (state.block.results.length > 0) {
      const id = await platform.showPopup({
        title: t("game.levelConfirm.title"),
        message: t("game.levelConfirm.message", { level: t(`level.${l}`) }),
        buttons: [
          { id: "cancel", type: "cancel" },
          { id: "ok", type: "default", text: t("game.levelConfirm.ok") },
        ],
      })
      if (id !== "ok") return
    }
    update((s) => ({ ...s, level: l, pendingLevel: null, block: newBlock(s.block.number, l, s.lives) }))
  }
}
