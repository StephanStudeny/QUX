import { useEffect, useRef } from "react"
import { GAME, LEVELS, LIFE_PACKS } from "@/config/game"
import type { Platform } from "@/platform/types"
import type { GameState } from "@/state/game-state"
import { applyPack } from "@/state/rewards"
import { backendEnabled, claimPurchase, reportLives, reportProgress, startSession, type ProgressReport } from "./backend"

/** Сколько вопросов первого блока пройдено: после первого блока — весь блок. */
export const firstBlockProgress = (s: GameState) => (s.block.number > 1 ? GAME.blockSize : Math.min(GAME.blockSize, s.block.results.length))

/** Пройдено блоков целиком: текущий засчитывается, когда дошёл до итогов. */
export const blocksDone = (s: GameState) => s.block.number - 1 + (s.block.phase === "results" ? 1 : 0)

/** Что видят друзья в профиле и автор в /top. */
export const progressReport = (s: GameState): ProgressReport => ({
  firstBlock: firstBlockProgress(s),
  level: s.level,
  blocks: blocksDone(s),
  answered: LEVELS.reduce((n, l) => n + s.stats.byLevel[l].answered, 0),
  avatar: s.avatar,
  nickname: s.nickname,
})

/**
 * Синхронизация с бэкендом поверх локального прогресса (CloudStorage остаётся источником правды
 * для игры, сервер — для всего, что даёт награды). Без VITE_API_URL ничего не делает.
 * Ошибки сети глотаем: игра работает и без сервера, следующий запуск всё доберёт.
 */
export function useBackendSync(platform: Platform, state: GameState | null, update: (fn: (s: GameState) => GameState) => void) {
  const ready = state !== null
  const sessionDone = useRef(false)

  // Запуск: регистрация, друзья и покупки, которые оплачены, но не дошли до клиента.
  useEffect(() => {
    if (!ready || sessionDone.current || !backendEnabled()) return
    sessionDone.current = true
    void (async () => {
      try {
        const { grants, friends } = await startSession(platform)
        update((s) => ({ ...s, friends }))
        for (const g of grants) {
          const pack = LIFE_PACKS.find((p) => p.id === g.packId)
          if (!pack) continue
          const { status } = await claimPurchase(platform, g.purchaseId)
          if (status === "claimed") update((s) => applyPack(s, pack))
        }
      } catch {
        /* сервер недоступен — играем локально, доберём при следующем запуске */
      }
    })()
  }, [ready, platform, update])

  const lives = state?.lives
  const anchor = state?.livesAnchor
  const notify = state?.settings.notifyLife
  useEffect(() => {
    if (lives === undefined || anchor === undefined || notify === undefined || !backendEnabled()) return
    const id = window.setTimeout(() => reportLives(platform, { lives, anchor, notify }).catch(() => {}), 1500)
    return () => window.clearTimeout(id)
  }, [platform, lives, anchor, notify])

  // Отчёт — строкой: эффект срабатывает, только когда что-то в нём поменялось.
  const report = state ? JSON.stringify(progressReport(state)) : undefined
  useEffect(() => {
    if (report === undefined || !backendEnabled()) return
    const id = window.setTimeout(() => reportProgress(platform, JSON.parse(report) as ProgressReport).catch(() => {}), 1500)
    return () => window.clearTimeout(id)
  }, [platform, report])
}
