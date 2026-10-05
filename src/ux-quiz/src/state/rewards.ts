import { GAME, HINT_TYPES, type LifePack } from "@/config/game"
import type { GameState } from "./game-state"

/**
 * Начисления. В проде их делает и проверяет бэкенд (Stars, рефералы) — клиент только
 * отражает результат. Здесь — та же логика для мока и мгновенного отклика.
 */

/** Жизни не бывают больше потолка: лишнее сгорает (правка Степана 2026-10-04). Подсказки — без лимита. */
const capLives = (n: number) => Math.min(GAME.livesMax, n)

/** Набор с подсказками — доступен всегда. */
export const isBundle = (pack: LifePack): pack is Extract<LifePack, { hints: number }> => "hints" in pack

/** Покупка: все пакеты доступны всегда; жизни — до потолка 20 (лишнее сгорает), подсказки — без лимита. */
export function applyPack(s: GameState, pack: LifePack): GameState {
  if (isBundle(pack)) {
    const hints = { ...s.hints }
    for (const h of HINT_TYPES) hints[h] += pack.hints
    return { ...s, lives: capLives(s.lives + pack.lives), hints }
  }
  return { ...s, lives: capLives(s.lives + pack.lives), livesAnchor: Date.now() }
}

/** Награда за друга: +5 ♥ (до потолка 20) и +3 каждой подсказки; друг помечается «получено». */
export function claimFriend(s: GameState, friendId: string): GameState {
  const hints = { ...s.hints }
  for (const h of HINT_TYPES) hints[h] += GAME.friendRewardHintsPerType
  return {
    ...s,
    lives: capLives(s.lives + GAME.friendRewardLives),
    hints,
    friends: s.friends.map((f) => (f.id === friendId ? { ...f, claimed: true } : f)),
  }
}

/** Друг засчитан, когда прошёл первый блок целиком. */
export const isQualified = (progress: number) => progress >= GAME.blockSize
