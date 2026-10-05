import { GAME, HINT_TYPES, LEVELS, type HintType, type Level } from "@/config/game"
import { newBlock, type GameState, type Outcome, type QuestionProgress } from "@/state/game-state"
import type { Question } from "./bank"

/** Окно неповторяемости: вопрос не показывается чаще раза в N показов. */
export const SEEN_WINDOW = 25
/** Каждые N верных подряд — случайная подсказка. */
export const STREAK_STEP = 5
/** Вопросов в супервикторине. */
export const SUPER_SIZE = 3
/** Повторов ошибок в одном блоке — не больше. */
export const REVIEW_PER_BLOCK = 2
/** Повтор — не раньше чем через столько блоков после последнего показа (2 = «через блок»). */
export const REVIEW_GAP_BLOCKS = 2
/** Верных ответов, после которых вопрос с ошибкой закрывается. */
export const REVIEW_CORRECT_TO_CLOSE = 3

/** Закрыт ли обычный вопрос: верно с первого раза или 3 верных (всего) после ошибки. */
export const isClosed = (p: QuestionProgress | undefined) =>
  !!p && (p.wrong ? p.correct >= REVIEW_CORRECT_TO_CLOSE : p.correct >= 1)

/** Сколько обычных вопросов уровня закрыто. */
export const closedCount = (bank: Question[], progress: GameState["progress"]) =>
  bank.filter((q) => q.tier === "regular" && isClosed(progress[q.id])).length

/**
 * Следующий обычный вопрос блока. Новые — никогда не показанные; закрытые не возвращаются.
 * Ошибки подмешиваются: не больше 2 на блок и не раньше чем через блок. Когда новых нет —
 * добираем незакрытыми ошибками без интервала. null — уровень пройден целиком.
 */
export function pickRegular(
  bank: Question[],
  s: GameState,
  exclude: string[] = [],
): { q: Question; review: boolean } | null {
  const regular = bank.filter((q) => q.tier === "regular" && !exclude.includes(q.id))
  const fresh = regular.filter((q) => !s.progress[q.id])
  const open = regular.filter((q) => { const p = s.progress[q.id]; return p && !isClosed(p) })
  const due = open.filter((q) => s.block.number - s.progress[q.id].lastBlock >= REVIEW_GAP_BLOCKS)

  const slotsLeft = GAME.blockSize - s.block.results.length
  const reviewsLeft = REVIEW_PER_BLOCK - s.block.reviewCount
  if (due.length && reviewsLeft > 0 && (Math.random() < 0.3 || slotsLeft <= reviewsLeft)) {
    return { q: due[rand(due.length)], review: true }
  }
  if (fresh.length) return { q: fresh[rand(fresh.length)], review: false }
  if (due.length) return { q: due[rand(due.length)], review: true }
  if (open.length) return { q: open[rand(open.length)], review: true }
  return null
}

/** Записать ответ в прогресс вопроса. */
function recordProgress(s: GameState, q: Question, correct: boolean): GameState {
  const prev = s.progress[q.id] ?? { correct: 0, wrong: false, lastBlock: s.block.number }
  return {
    ...s,
    progress: {
      ...s.progress,
      [q.id]: { correct: prev.correct + (correct ? 1 : 0), wrong: prev.wrong || !correct, lastBlock: s.block.number },
    },
  }
}

const rand = (n: number) => Math.floor(Math.random() * n)

/** Перемешанный порядок вариантов: order[i] — индекс варианта в options. */
export function shuffledOrder(): number[] {
  const a = [0, 1, 2, 3]
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Вопрос супервикторины: не из последних 25 показанных и не из `exclude`.
 * Если всё «свежее» исчерпано — правило ослабляется, но не повторяем текущий.
 */
export function pickQuestion(bank: Question[], tier: Question["tier"], seen: string[], exclude: string[] = []): Question {
  const pool = bank.filter((q) => q.tier === tier && !exclude.includes(q.id))
  const recent = new Set(seen.slice(-SEEN_WINDOW))
  const fresh = pool.filter((q) => !recent.has(q.id))
  const from = fresh.length ? fresh : pool.length ? pool : bank
  return from[rand(from.length)]
}

export const markSeen = (seen: string[], id: string) => [...seen.filter((x) => x !== id), id].slice(-SEEN_WINDOW * 2)

/** Какие варианты убрать подсказкой: 50/50 — два неверных, «−1» — один. Уже убранные не трогаем. */
export function hintRemovals(q: Question, type: "fifty" | "eraser", removed: number[]): number[] {
  const wrong = [0, 1, 2, 3].filter((i) => i !== q.correct && !removed.includes(i))
  const count = type === "fifty" ? 2 : 1
  const out: number[] = []
  while (out.length < count && wrong.length) out.push(wrong.splice(rand(wrong.length), 1)[0])
  return out
}

/** Потратить подсказку. */
export const spendHint = (s: GameState, type: HintType): GameState => ({
  ...s,
  hints: { ...s.hints, [type]: Math.max(0, s.hints[type] - 1) },
})

/** Минус жизнь; таймер восстановления стартует, когда жизней становится меньше порога. */
function loseLife(s: GameState, now: number): GameState {
  const lives = Math.max(0, s.lives - 1)
  const anchor = s.lives >= GAME.livesRegenCap ? now : s.livesAnchor
  return { ...s, lives, livesAnchor: anchor }
}

/** Случайная подсказка любого типа — лимита нет, награда не сгорает. */
function grantRandomHint(s: GameState): { state: GameState; hint: HintType } {
  const hint = HINT_TYPES[rand(HINT_TYPES.length)]
  return { state: { ...s, hints: { ...s.hints, [hint]: s.hints[hint] + 1 } }, hint }
}

/** Событие после ответа, которое экран должен показать. */
export type AnswerEvent =
  | { kind: "streak"; streak: number; hint: HintType; thenPerfect?: boolean }
  | { kind: "block-failed"; mistakes: number }
  /** 10 из 10 без ошибок — предложение «поднять ставки» (супервикторина). */
  | { kind: "perfect" }
  | { kind: "super-done"; passed: boolean; livesBefore: number; livesAfter: number; burned: number; hint: HintType | null }

/** Обычный вопрос: исход, статистика, серия, переход к супервикторине после 10-го. */
export function applyRegularOutcome(
  s0: GameState,
  q: Question,
  outcome: Outcome,
  now: number,
  review = false,
): { state: GameState; event: AnswerEvent | null } {
  let s = s0
  if (outcome !== "skip") s = recordProgress(s, q, outcome === "correct")
  if (review) s = { ...s, block: { ...s.block, reviewCount: s.block.reviewCount + 1 } }
  const level = s.block.level
  const lvl = s.stats.byLevel[level]
  let event: AnswerEvent | null = null

  if (outcome === "correct") {
    const streak = s.streak + 1
    s = {
      ...s,
      streak,
      stats: {
        ...s.stats,
        bestStreak: Math.max(s.stats.bestStreak, streak),
        byLevel: { ...s.stats.byLevel, [level]: { answered: lvl.answered + 1, correct: lvl.correct + 1 } },
      },
      block: { ...s.block, bestStreak: Math.max(s.block.bestStreak, streak) },
    }
    if (streak % STREAK_STEP === 0) {
      const r = grantRandomHint(s)
      s = r.state
      s = { ...s, block: { ...s.block, hintsGained: s.block.hintsGained + 1 } }
      event = { kind: "streak", streak, hint: r.hint }
    }
  } else if (outcome === "wrong" || outcome === "timeout") {
    s = loseLife(s, now)
    s = {
      ...s,
      streak: 0,
      stats: { ...s.stats, byLevel: { ...s.stats.byLevel, [level]: { ...lvl, answered: lvl.answered + 1 } } },
      block: { ...s.block, wrongIds: [...s.block.wrongIds, q.id] },
    }
  }
  // «Пропуск» серию не рвёт и засчитывается в блок.

  const results = [...s.block.results, outcome]
  const mistakes = results.filter((r) => r === "wrong" || r === "timeout").length
  // Супервикторина — только за блок без ошибок (пропуск ошибкой не считается); иначе сразу итоги.
  const done = results.length >= GAME.blockSize
  const phase = !done ? "regular" : mistakes === 0 ? "super-intro" : "results"
  if (done && mistakes === 0) event = event?.kind === "streak" ? { ...event, thenPerfect: true } : { kind: "perfect" }
  if ((outcome === "wrong" || outcome === "timeout") && mistakes >= GAME.blockMistakesLimit) {
    // Блок остановлен: экран предложит сыграть его заново (restartBlock) или выйти.
    event = { kind: "block-failed", mistakes }
  }
  return { state: { ...s, block: { ...s.block, results, phase } }, event }
}

/** Вопрос супервикторины; после третьего — итог (+3 ♥ сверх лимита сгорает, и подсказка). */
export function applySuperOutcome(
  s0: GameState,
  q: Question,
  outcome: Exclude<Outcome, "skip">,
  now: number,
): { state: GameState; event: AnswerEvent | null } {
  let s = s0
  if (outcome !== "correct") {
    s = loseLife(s, now)
    s = { ...s, streak: 0, block: { ...s.block, wrongIds: [...s.block.wrongIds, q.id] } }
  }
  const superResults = [...s.block.superResults, outcome]
  s = { ...s, block: { ...s.block, superResults, superIds: [...(s.block.superIds ?? []), q.id] } }
  if (superResults.length < SUPER_SIZE) return { state: s, event: null }

  const passed = superResults.every((r) => r === "correct")
  const livesBefore = s.lives
  let burned = 0
  let hint: HintType | null = null
  if (passed) {
    const target = livesBefore + GAME.superRewardLives
    const livesAfter = Math.max(livesBefore, Math.min(GAME.livesMax, target))
    burned = target - livesAfter
    s = { ...s, lives: livesAfter }
    const r = grantRandomHint(s)
    s = r.state
    hint = r.hint
  }
  s = {
    ...s,
    block: {
      ...s.block,
      phase: "results",
      superLives: passed ? s.lives - livesBefore : 0,
      hintsGained: s.block.hintsGained + (hint ? 1 : 0),
    },
    stats: { ...s.stats, superPlayed: s.stats.superPlayed + 1, superPassed: s.stats.superPassed + (passed ? 1 : 0) },
  }
  return { state: s, event: { kind: "super-done", passed, livesBefore, livesAfter: s.lives, burned, hint } }
}

/** Сыграть блок заново: тот же номер и уровень, результаты блока с нуля (жизни не возвращаются). */
export const restartBlock = (s: GameState): GameState => ({ ...s, block: newBlock(s.block.number, s.block.level, s.lives) })

/** Уровень выше текущего или null (Сениор — верхний). */
export const levelAbove = (l: Level): Level | null => LEVELS[LEVELS.indexOf(l) + 1] ?? null

/** Следующий блок: новый номер; `level` — сразу на другом уровне (повышение после супервикторины 3/3). */
export function startNextBlock(s: GameState, levelOverride?: Level): GameState {
  const level = levelOverride ?? s.pendingLevel ?? s.level ?? s.block.level
  return { ...s, level, pendingLevel: null, block: newBlock(s.block.number + 1, level, s.lives) }
}
