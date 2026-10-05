/**
 * Игровые числа (game-brief.md → «Решения (журнал)»).
 * Только здесь, без хардкода в экранах. Начисления наград всё равно проверяет сервер.
 */
export const GAME = {
  /** Жёсткий потолок жизней (правка Степана 2026-10-04): всё сверх 20 сгорает — покупки, награды за друзей и супервикторину. */
  livesMax: 20,
  /** До скольки жизней идёт восстановление со временем. */
  livesRegenCap: 5,
  /** Одна жизнь восстанавливается раз в час. */
  livesRegenMs: 60 * 60 * 1000,
  /** Стартовый запас каждого типа подсказки. Лимита нет — копятся без ограничений (правка Степана 2026-10-04). */
  hintStart: 3,
  /** Секунд на вопрос; истёк — ошибка (−1 ♥, серия сброшена). */
  questionSeconds: 40,
  /** Столько ошибок в обычных вопросах блока — и блок останавливается («попробуйте заново»). */
  blockMistakesLimit: 3,
  /** Вопросов в блоке; супервикторина идёт после последнего. */
  blockSize: 10,
  /** Награда за супервикторину 3/3. */
  superRewardLives: 3,
  /** Награда за каждого друга, прошедшего первый блок (начисляется сверх лимита). */
  friendRewardLives: 5,
  friendRewardHintsPerType: 3,
} as const

export const HINT_TYPES = ["fifty", "eraser", "skip"] as const
export type HintType = (typeof HINT_TYPES)[number]

export const LEVELS = ["junior", "middle", "senior"] as const
export type Level = (typeof LEVELS)[number]

export const LANGUAGES = ["ru", "en"] as const
export type Language = (typeof LANGUAGES)[number]

/**
 * Языки, доступные игроку. Один язык — выбор языка (4.0 и строка в Настройках) не показывается,
 * язык ставится сам. EN включён 2026-10-04: банк вопросов переведён (design/questions/*.en.json).
 */
export const ENABLED_LANGUAGES: readonly Language[] = ["ru", "en"]

/**
 * Пакеты Буста за Telegram Stars (1.3). «До максимума» убран 2026-10-05. Цены — прикидка, финальные утвердит Степан.
 * Наборы (`hints` — по столько каждого типа) начисляются сверх лимита, как награда за друга:
 * иначе «по 6 подсказок» при лимите 3 сгорали бы. Жизнь ≈ 13–15 ⭐, подсказка ≈ 7–8 ⭐, старший набор выгоднее.
 */
export const LIFE_PACKS = [
  { id: "one", lives: 1, stars: 15 },
  { id: "three", lives: 3, stars: 40 },
  { id: "bundle5", lives: 5, hints: 3, stars: 120 },
  { id: "bundle10", lives: 10, hints: 6, stars: 220 },
] as const
export type LifePack = (typeof LIFE_PACKS)[number]

/**
 * Ссылки. TODO(Степан): имя бота и short name Mini App из BotFather, политика, сбор на донаты.
 * Пока пустые — строки ведут на заглушку.
 */
export const LINKS = {
  bot: "ux_quiz_bot",
  app: "play",
  /** Политика — статичные страницы public/legal/privacy-{ru,en}.html (открываются из Настроек). */
  privacy: "legal/privacy",
  /** Прикреплённый сбор средств (донаты автору). */
  donate: "",
} as const
