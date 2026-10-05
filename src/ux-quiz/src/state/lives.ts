import { GAME } from "@/config/game"

/**
 * Восстановление жизней: +1 за каждые `livesRegenMs`, но только пока жизней меньше `livesRegenCap`.
 * `anchor` — момент, от которого отсчитывается следующая жизнь.
 * Чистые функции: клиент показывает, а итог при наградах всё равно сверяет сервер.
 */
export function applyRegen(lives: number, anchor: number, now: number): { lives: number; anchor: number } {
  if (lives >= GAME.livesRegenCap) return { lives, anchor: now }
  const gained = Math.floor(Math.max(0, now - anchor) / GAME.livesRegenMs)
  if (gained === 0) return { lives, anchor }
  const next = Math.min(GAME.livesRegenCap, lives + gained)
  return { lives: next, anchor: next >= GAME.livesRegenCap ? now : anchor + gained * GAME.livesRegenMs }
}

/** Сколько осталось до следующей жизни; null — восстановления нет (жизней ≥ порога восстановления). */
export function msToNextLife(lives: number, anchor: number, now: number): number | null {
  if (lives >= GAME.livesRegenCap) return null
  return GAME.livesRegenMs - (Math.max(0, now - anchor) % GAME.livesRegenMs)
}

/** 42:10 — минуты и секунды (до часа больше не бывает). */
export function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, "0")}`
}
