import { typograph } from "@/lib/typograph"
import type { Language, Level } from "@/config/game"

/** Вопрос банка — схема `meta.schema` в design/questions/*.json. */
export interface Question {
  id: string
  level: Level
  pool: "practice" | "theory"
  area: "ux" | "ui" | "product"
  tier: "regular" | "super"
  question: string
  /** Путь к иллюстрации или null — тогда блок картинки не показывается вовсе. */
  image: string | null
  options: [string, string, string, string]
  correct: number
  funny: number[]
  explanation: string
  source: string | null
  status: "draft" | "approved"
}

/** Перевод вопроса (design/questions/<level>.en.json): те же id и порядок вариантов, только тексты. */
interface Translation {
  id: string
  question: string
  options: [string, string, string, string]
  explanation: string
}

type Json<T> = Promise<{ default: { questions: T[] } }>

// Банки уровней грузятся по требованию: ~90 КБ на уровень не нужны на старте.
const RU: Record<Level, () => Json<unknown>> = {
  junior: () => import("@questions/junior.json"),
  middle: () => import("@questions/middle.json"),
  senior: () => import("@questions/senior.json"),
}
const EN: Record<Level, () => Json<unknown>> = {
  junior: () => import("@questions/junior.en.json"),
  middle: () => import("@questions/middle.en.json"),
  senior: () => import("@questions/senior.en.json"),
}

const cache = new Map<string, Question[]>()

/**
 * Вопросы уровня на языке интерфейса (кэшируются на время сессии). Логика (верный ответ,
 * шуточные варианты, уровень, пул) — из русского банка; для EN подменяются только тексты.
 * Вопроса нет в переводе — остаётся русский текст.
 */
export async function loadBank(level: Level, lang: Language = "ru"): Promise<Question[]> {
  const key = `${level}:${lang}`
  const hit = cache.get(key)
  if (hit) return hit
  const base = (await RU[level]()).default.questions as Question[]
  let questions = base
  if (lang === "en") {
    const tr = new Map(((await EN[level]()).default.questions as Translation[]).map((t) => [t.id, t]))
    questions = base.map((q) => {
      const t = tr.get(q.id)
      return t ? { ...q, question: t.question, options: t.options, explanation: t.explanation } : q
    })
  }
  // Экранная типографика вопросов, вариантов и пояснений (файлы банка не меняем).
  questions = questions.map((q) => ({
    ...q,
    question: typograph(q.question, lang),
    options: q.options.map((o) => typograph(o, lang)) as Question["options"],
    explanation: q.explanation ? typograph(q.explanation, lang) : q.explanation,
  }))
  cache.set(key, questions)
  return questions
}

/** Синхронный доступ после загрузки — поиск вопроса по id, сначала на нужном языке (разбор супервикторины). */
export const findQuestion = (id: string, lang: Language = "ru"): Question | undefined => {
  const entries = [...cache.entries()].sort(([a], [b]) => Number(b.endsWith(`:${lang}`)) - Number(a.endsWith(`:${lang}`)))
  for (const [, list] of entries) {
    const q = list.find((x) => x.id === id)
    if (q) return q
  }
  return undefined
}
