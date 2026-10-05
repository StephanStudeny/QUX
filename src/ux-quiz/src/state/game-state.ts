import { GAME, type HintType, type Language, type Level } from "@/config/game"

/** Прогресс игрока, который хранится в CloudStorage (в браузере — localStorage). */
export interface GameState {
  version: 5
  /** null — первый запуск, показать выбор языка (4.0). */
  language: Language | null
  /** null — первый запуск, показать выбор уровня (4.2). */
  level: Level | null
  /** Уровень, который включится со следующего блока (смена в Настройках). */
  pendingLevel: Level | null
  /** id аватара из набора или null — фото из Telegram. */
  avatar: string | null
  /** Никнейм, заданный в профиле; null — имя из Telegram. */
  nickname: string | null
  /**
   * Прогресс по обычным вопросам (супервопросы сюда не входят).
   * Верно с первого раза — вопрос закрыт навсегда; после ошибки он повторяется,
   * пока не наберёт 3 верных ответа (счётчик копится и не обнуляется).
   */
  progress: Record<string, QuestionProgress>
  lives: number
  /** Отсчёт следующей жизни, ms since epoch. */
  livesAnchor: number
  hints: Record<HintType, number>
  block: Block
  /** Текущая серия верных подряд (каждые 5 — случайная подсказка). */
  streak: number
  /** Последние показанные вопросы: вопрос не повторяется чаще раза в 25 показов. */
  seen: string[]
  /** Тултипы первой встречи (4.3–4.5) — показаны ли уже. */
  tips: { timer: boolean; hints: boolean; lives: boolean }
  stats: Stats
  settings: Settings
  /** Приглашённые друзья. Источник правды — бэкенд, здесь кэш/мок. */
  friends: Friend[]
}

export interface QuestionProgress {
  /** Сколько раз отвечен верно. */
  correct: number
  /** Была ли ошибка (неверно или время вышло). */
  wrong: boolean
  /** Номер блока, в котором вопрос показывался последний раз. */
  lastBlock: number
}

/** Исход вопроса: верно / ошибка / время вышло / пропуск подсказкой. */
export type Outcome = "correct" | "wrong" | "timeout" | "skip"

/** Этап блока: 10 обычных → вступление супервикторины → 3 сложных → итоги. */
export type BlockPhase = "regular" | "super-intro" | "super" | "results"

export interface Block {
  number: number
  level: Level
  phase: BlockPhase
  /** Исходы обычных вопросов, по порядку (точки прогресса). */
  results: Outcome[]
  /** Исходы вопросов супервикторины (пропуск заменяет вопрос и не пишется). */
  superResults: Outcome[]
  /** id отвеченных вопросов супервикторины по порядку — для разбора «Почти!» (переживает перезагрузку). */
  superIds?: string[]
  /** id вопросов с ошибкой — для «Разобрать ошибки». */
  wrongIds: string[]
  livesStart: number
  /** Жизни, начисленные супервикториной (с учётом сгоревших). */
  superLives: number
  hintsGained: number
  bestStreak: number
  /** Сколько повторов ошибок уже было в этом блоке (не больше REVIEW_PER_BLOCK). */
  reviewCount: number
}

export const newBlock = (number: number, level: Level, lives: number): Block => ({
  number,
  level,
  phase: "regular",
  results: [],
  superResults: [],
  wrongIds: [],
  livesStart: lives,
  superLives: 0,
  hintsGained: 0,
  bestStreak: 0,
  reviewCount: 0,
})

export interface Settings {
  notifyLife: boolean
  sound: boolean
  haptics: boolean
  showExplanation: boolean
}

/** Друг: прошёл ли первый блок (0–10 вопросов) и забрана ли награда. */
export interface Friend {
  id: string
  name: string
  progress: number
  claimed: boolean
}

/** Статистика профиля (1.2). Общие «Ответов» и «Верно» считаются из разбивки по уровням. */
export interface Stats {
  byLevel: Record<Level, { answered: number; correct: number }>
  bestStreak: number
  superPlayed: number
  superPassed: number
}

const emptyStats = (): Stats => ({
  byLevel: { junior: { answered: 0, correct: 0 }, middle: { answered: 0, correct: 0 }, senior: { answered: 0, correct: 0 } },
  bestStreak: 0,
  superPlayed: 0,
  superPassed: 0,
})

export const STATE_KEY = "state"

export function initialState(now: number): GameState {
  return {
    version: 5,
    language: null,
    level: null,
    pendingLevel: null,
    avatar: null,
    nickname: null,
    progress: {},
    lives: GAME.livesRegenCap,
    livesAnchor: now,
    // Первая игра — по 3 подсказки каждого типа (правка Степана 2026-10-04).
    hints: { fifty: GAME.hintStart, eraser: GAME.hintStart, skip: GAME.hintStart },
    block: newBlock(1, "middle", GAME.livesRegenCap),
    streak: 0,
    seen: [],
    tips: { timer: false, hints: false, lives: false },
    stats: emptyStats(),
    settings: { notifyLife: true, sound: true, haptics: true, showExplanation: true },
    friends: [],
  }
}

/** Мок прогресса: закрытые вопросы по уровням + пара ошибок на повтор. */
function mockProgress(): Record<string, QuestionProgress> {
  const p: Record<string, QuestionProgress> = {}
  const close = (prefix: string, n: number) => {
    for (let i = 1; i <= n; i++) p[`${prefix}-${String(i).padStart(3, "0")}`] = { correct: 1, wrong: false, lastBlock: 1 }
  }
  close("j", 60)
  close("m", 71)
  close("s", 9)
  p["m-090"] = { correct: 1, wrong: true, lastBlock: 1 }
  p["m-091"] = { correct: 0, wrong: true, lastBlock: 1 }
  return p
}

/**
 * Мок для разработки — повторяет макет 1.1: 4 / 10 ♥, следующая через 42:10,
 * по подсказке каждого типа, блок 3 · вопрос 4 из 10.
 */
export function mockState(now: number): GameState {
  const elapsed = GAME.livesRegenMs - (42 * 60 + 10) * 1000
  return {
    ...initialState(now),
    language: "ru",
    level: "middle",
    lives: 4,
    livesAnchor: now - elapsed,
    avatar: "fox",
    hints: { fifty: 1, eraser: 1, skip: 1 },
    // Блок с нуля, как у игрока вне квиза (незаконченный блок сгорает). Середина блока — `?demo=quiz`. Тултипы уже пройдены.
    block: { ...newBlock(3, "middle", 5), wrongIds: [] },
    streak: 0,
    tips: { timer: true, hints: true, lives: true },
    // Макет 1.2: 184 ответа, по уровням 82% · 60 / 68% · 104 / 45% · 20, серия 12, супервикторины 3 из 7.
    stats: {
      byLevel: { junior: { answered: 60, correct: 49 }, middle: { answered: 104, correct: 71 }, senior: { answered: 20, correct: 9 } },
      bestStreak: 12,
      superPlayed: 7,
      superPassed: 3,
    },
    progress: mockProgress(),
    // Друзья — только реальные (с бэкенда); демо-список убран.
    friends: [],
  }
}

/** Демо-варианты мока (`?demo=`) поверх данных макета — только для просмотра в браузере. */
export function applyDemo(s: GameState, demo: string | null): GameState {
  const R = (n: number, o: Outcome = "correct") => Array.from({ length: n }, () => o)
  switch (demo) {
    case "quiz":
      // Макет 2.1: две верных, ошибка, сейчас 4-й вопрос.
      return { ...s, block: { ...s.block, results: ["correct", "correct", "wrong"] } }
    case "super":
      return { ...s, block: { ...s.block, results: [...R(8), "wrong", "correct"], phase: "super-intro" } }
    case "results":
      return {
        ...s,
        lives: 8,
        // Супервикторина бывает только после блока без ошибок: 9 верных + пропуск, супер 3/3.
        block: {
          ...s.block,
          results: [...R(6), "skip", ...R(3)],
          superResults: R(3),
          phase: "results",
          livesStart: 5,
          superLives: 3,
          hintsGained: 2,
          bestStreak: 9,
          wrongIds: [],
        },
      }
    case "livesout":
      return { ...s, lives: 0, livesAnchor: Date.now() - 2 * 60 * 1000, block: { ...s.block, wrongIds: ["m-001", "m-003"] } }
    case "streak":
      return { ...s, streak: 4 }
    case "twowrong":
      return { ...s, lives: 6, block: { ...s.block, results: ["correct", "wrong", "correct", "timeout"] } }
    case "nine":
      return { ...s, streak: 0, block: { ...s.block, results: R(9) } }
    default:
      return s
  }
}

/**
 * Разбор сохранённого прогресса с миграцией: сохранение старой версии не выбрасываем,
 * а дополняем недостающими полями по умолчанию. Жизни, подсказки, статистика и пройденные
 * вопросы переживают любое обновление игры. Битый JSON → null (начнём заново).
 */
export function parseState(raw: string | null, now = Date.now()): GameState | null {
  if (!raw) return null
  let saved: Partial<GameState> & { version?: number }
  try {
    saved = JSON.parse(raw)
  } catch {
    return null
  }
  if (!saved || typeof saved !== "object" || typeof saved.lives !== "number") return null
  const base = initialState(now)
  const level = saved.level ?? saved.block?.level ?? "middle"
  return {
    ...base,
    ...saved,
    version: base.version,
    hints: { ...base.hints, ...saved.hints },
    progress: saved.progress ?? {},
    seen: saved.seen ?? [],
    tips: { ...base.tips, ...saved.tips },
    settings: { ...base.settings, ...saved.settings },
    stats: { ...base.stats, ...saved.stats, byLevel: { ...base.stats.byLevel, ...saved.stats?.byLevel } },
    friends: saved.friends ?? [],
    // Блок старого формата (без results) — начинаем текущий блок заново, номер сохраняем.
    block: Array.isArray(saved.block?.results)
      ? { ...newBlock(saved.block.number, saved.block.level ?? level, saved.lives), ...saved.block }
      : newBlock(saved.block?.number ?? 1, level, saved.lives),
  }
}
