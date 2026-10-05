import { describe, expect, it } from "vitest"
import { GAME } from "@/config/game"
import type { Question } from "@/quiz/bank"
import {
  applyRegularOutcome,
  applySuperOutcome,
  closedCount,
  hintRemovals,
  isClosed,
  levelAbove,
  pickQuestion,
  pickRegular,
  restartBlock,
  startNextBlock,
} from "@/quiz/engine"
import { initialState, newBlock, parseState, type GameState } from "@/state/game-state"
import { applyRegen, msToNextLife } from "@/state/lives"
import { applyPack, claimFriend } from "@/state/rewards"

const q = (id: string, tier: Question["tier"] = "regular"): Question => ({
  id,
  level: "middle",
  pool: "theory",
  area: "ux",
  tier,
  question: "?",
  image: null,
  options: ["a", "b", "c", "d"],
  correct: 1,
  funny: [3],
  explanation: "",
  source: null,
  status: "draft",
})

const base = (patch: Partial<GameState> = {}): GameState => ({
  ...initialState(0),
  language: "ru",
  level: "middle",
  block: newBlock(1, "middle", 5),
  ...patch,
})

describe("жизни", () => {
  it("восстанавливаются +1 в час только до 5", () => {
    expect(applyRegen(2, 0, 2.5 * GAME.livesRegenMs).lives).toBe(4)
    expect(applyRegen(4, 0, 10 * GAME.livesRegenMs).lives).toBe(GAME.livesRegenCap)
    expect(applyRegen(7, 0, 10 * GAME.livesRegenMs).lives).toBe(7)
  })
  it("таймер скрыт, когда жизней не меньше порога восстановления", () => {
    expect(msToNextLife(5, 0, 0)).toBeNull()
    expect(msToNextLife(13, 0, 0)).toBeNull()
    expect(msToNextLife(4, 0, 0)).toBe(GAME.livesRegenMs)
  })
})

describe("обычный вопрос", () => {
  it("ошибка: −1 ♥, серия сброшена, вопрос в разбор", () => {
    const { state } = applyRegularOutcome(base({ lives: 4, streak: 3 }), q("x"), "wrong", 0)
    expect(state.lives).toBe(3)
    expect(state.streak).toBe(0)
    expect(state.block.wrongIds).toEqual(["x"])
  })
  it("время вышло = ошибка", () => {
    expect(applyRegularOutcome(base({ lives: 4 }), q("x"), "timeout", 0).state.lives).toBe(3)
  })
  it("пропуск не рвёт серию и засчитывается в блок", () => {
    const { state } = applyRegularOutcome(base({ streak: 3 }), q("x"), "skip", 0)
    expect(state.streak).toBe(3)
    expect(state.block.results).toEqual(["skip"])
  })
  it("каждые 5 верных подряд — случайная подсказка; лимита нет, не сгорает", () => {
    const r = applyRegularOutcome(base({ streak: 4, hints: { fifty: 0, eraser: 0, skip: 0 } }), q("x"), "correct", 0)
    expect(r.event).toMatchObject({ kind: "streak", streak: 5 })
    const total = Object.values(r.state.hints).reduce((a, b) => a + b, 0)
    expect(total).toBe(1)

    const many = base({ streak: 9, hints: { fifty: 9, eraser: 9, skip: 9 } })
    const r2 = applyRegularOutcome(many, q("x"), "correct", 0)
    expect(r2.event).toMatchObject({ kind: "streak" })
    expect(Object.values(r2.state.hints).reduce((a, b) => a + b, 0)).toBe(28)
  })
  it("после 10-го вопроса — вступление супервикторины", () => {
    const s = base({ block: { ...newBlock(1, "middle", 5), results: Array(9).fill("correct") } })
    expect(applyRegularOutcome(s, q("x"), "correct", 0).state.block.phase).toBe("super-intro")
  })
})

describe("супервикторина", () => {
  const inSuper = (patch: Partial<GameState> = {}) =>
    base({ block: { ...newBlock(1, "middle", 5), phase: "super", superResults: ["correct", "correct"] }, ...patch })

  it("3/3: +3 ♥ сверх максимума сгорают, подсказка, итоги", () => {
    const r = applySuperOutcome(inSuper({ lives: 18 }), q("s", "super"), "correct", 0)
    expect(r.state.lives).toBe(GAME.livesMax)
    expect(r.event).toMatchObject({ kind: "super-done", passed: true, livesBefore: 18, livesAfter: 20, burned: 1 })
    expect(r.state.block.phase).toBe("results")
    expect(r.state.stats.superPassed).toBe(1)
  })
  it("2/3: без награды, жизнь за ошибку", () => {
    const r = applySuperOutcome(inSuper({ lives: 5 }), q("s", "super"), "wrong", 0)
    expect(r.state.lives).toBe(4)
    expect(r.event).toMatchObject({ kind: "super-done", passed: false })
  })
})

describe("награды и покупки", () => {
  it("награда за друга начисляется сверх лимита", () => {
    const s = base({ lives: 9, hints: { fifty: 3, eraser: 1, skip: 0 }, friends: [{ id: "1", name: "Аня", progress: 10, claimed: false }] })
    const r = claimFriend(s, "1")
    expect(r.lives).toBe(14)
    expect(r.hints).toEqual({ fifty: 6, eraser: 4, skip: 3 })
    expect(r.friends[0].claimed).toBe(true)
  })
  it("пакет жизней не поднимает выше потолка 20: лишнее сгорает", () => {
    expect(applyPack(base({ lives: 9 }), { id: "three", lives: 3, stars: 40 }).lives).toBe(12)
    expect(applyPack(base({ lives: 19 }), { id: "three", lives: 3, stars: 40 }).lives).toBe(20)
  })
})

describe("вопросы", () => {
  it("не повторяет недавно показанные, пока есть свежие", () => {
    const bank = [q("a"), q("b"), q("c")]
    for (let i = 0; i < 20; i++) expect(pickQuestion(bank, "regular", ["a", "b"]).id).toBe("c")
  })
  it("50/50 убирает два неверных, −1 — один, верный не трогает", () => {
    const r = hintRemovals(q("a"), "fifty", [])
    expect(r).toHaveLength(2)
    expect(r).not.toContain(1)
    expect(hintRemovals(q("a"), "eraser", [0, 2])).toEqual([3])
  })
  it("смена уровня вступает со следующего блока", () => {
    const s = startNextBlock(base({ pendingLevel: "senior" }))
    expect(s.level).toBe("senior")
    expect(s.block.level).toBe("senior")
    expect(s.block.number).toBe(2)
    expect(s.pendingLevel).toBeNull()
  })
})

describe("закрытие вопросов и повтор ошибок", () => {
  const bank = [q("a"), q("b"), q("c"), q("s1", "super")]

  it("верно с первого раза — вопрос закрыт и больше не выпадает", () => {
    const s = applyRegularOutcome(base(), q("a"), "correct", 0).state
    expect(isClosed(s.progress.a)).toBe(true)
    for (let i = 0; i < 20; i++) expect(pickRegular(bank, s)?.q.id).not.toBe("a")
  })

  it("после ошибки нужно 3 верных; счётчик копится и не обнуляется ошибкой", () => {
    let s = applyRegularOutcome(base(), q("a"), "wrong", 0).state
    s = applyRegularOutcome(s, q("a"), "correct", 0).state
    s = applyRegularOutcome(s, q("a"), "wrong", 0).state
    s = applyRegularOutcome(s, q("a"), "correct", 0).state
    expect(isClosed(s.progress.a)).toBe(false)
    s = applyRegularOutcome(s, q("a"), "correct", 0).state
    expect(isClosed(s.progress.a)).toBe(true)
  })

  it("ошибка возвращается не раньше чем через блок и не больше 2 повторов на блок", () => {
    const wrongIn = (block: number) => ({ correct: 0, wrong: true, lastBlock: block })
    const progress = { a: wrongIn(4), b: wrongIn(4), c: wrongIn(4) }
    const sameNext = base({ progress, block: { ...newBlock(5, "middle", 5), results: [] } })
    // Через один блок ещё рано, но новых нет — добираем незакрытыми.
    expect(pickRegular([q("a"), q("b"), q("c"), q("d")], sameNext)?.q.id).toBe("d")
    const later = base({ progress, block: { ...newBlock(6, "middle", 5), results: Array(8).fill("correct"), reviewCount: 2 } })
    // Лимит повторов исчерпан — берём новый вопрос.
    expect(pickRegular([q("a"), q("d")], later)?.q.id).toBe("d")
  })

  it("супервопросы в прогресс не попадают и в подсчёт не входят", () => {
    const s = applySuperOutcome(base({ block: { ...newBlock(1, "middle", 5), phase: "super" } }), q("s1", "super"), "correct", 0).state
    expect(s.progress.s1).toBeUndefined()
    expect(closedCount(bank, { a: { correct: 1, wrong: false, lastBlock: 1 } })).toBe(1)
  })

  it("все обычные закрыты — уровень пройден (null)", () => {
    const closed = { correct: 1, wrong: false, lastBlock: 1 }
    expect(pickRegular(bank, base({ progress: { a: closed, b: closed, c: closed } }))).toBeNull()
  })
})

describe("лимит ошибок в блоке", () => {
  it("третья ошибка (неверно или время) останавливает блок; «Играть» начинает его заново", () => {
    const s = base({ lives: 6, block: { ...newBlock(4, "middle", 6), results: ["correct", "wrong", "skip", "timeout"] } })
    const r = applyRegularOutcome(s, q("x"), "wrong", 0)
    expect(r.event).toEqual({ kind: "block-failed", mistakes: 3 })
    const again = restartBlock(r.state)
    expect(again.block.number).toBe(4)
    expect(again.block.results).toEqual([])
    expect(again.lives).toBe(5)
  })
  it("две ошибки — блок продолжается", () => {
    const s = base({ block: { ...newBlock(1, "middle", 5), results: ["wrong"] } })
    expect(applyRegularOutcome(s, q("x"), "timeout", 0).event).toBeNull()
  })
})

describe("супервикторина только за блок без ошибок", () => {
  it("10/10 — событие «поднимем ставки» и фаза супервикторины; пропуск ошибкой не считается", () => {
    const s = base({ block: { ...newBlock(1, "middle", 5), results: [...Array(8).fill("correct"), "skip"] } })
    const r = applyRegularOutcome(s, q("x"), "correct", 0)
    expect(r.event).toEqual({ kind: "perfect" })
    expect(r.state.block.phase).toBe("super-intro")
  })
  it("с ошибкой — сразу итоги, без супервикторины", () => {
    const s = base({ block: { ...newBlock(1, "middle", 5), results: [...Array(8).fill("correct"), "wrong"] } })
    const r = applyRegularOutcome(s, q("x"), "correct", 0)
    expect(r.event).toBeNull()
    expect(r.state.block.phase).toBe("results")
  })
  it("серия на 10-м вопросе — сначала награда за серию, потом «поднимем ставки»", () => {
    const s = base({ streak: 9, block: { ...newBlock(1, "middle", 5), results: Array(9).fill("correct") } })
    expect(applyRegularOutcome(s, q("x"), "correct", 0).event).toMatchObject({ kind: "streak", thenPerfect: true })
  })
  it("после 3/3 следующий блок можно начать уровнем выше", () => {
    expect(levelAbove("junior")).toBe("middle")
    expect(levelAbove("senior")).toBeNull()
    const s = startNextBlock(base(), "senior")
    expect(s.block.level).toBe("senior")
    expect(s.level).toBe("senior")
  })
})

describe("первая игра", () => {
  it("новичок стартует с 3 подсказками каждого типа", () => {
    expect(initialState(0).hints).toEqual({ fifty: 3, eraser: 3, skip: 3 })
  })
})

describe("сохранение переживает обновления", () => {
  it("старая версия не выбрасывается: жизни, подсказки, статистика и вопросы на месте", () => {
    const old = JSON.stringify({
      version: 3, language: "ru", level: "middle", lives: 7, livesAnchor: 0,
      hints: { fifty: 2, eraser: 0, skip: 3 }, block: { number: 4, answered: 2 },
      stats: { byLevel: { middle: { answered: 40, correct: 30 } }, bestStreak: 9, superPlayed: 1, superPassed: 1 },
    })
    const s = parseState(old)!
    expect(s.version).toBe(initialState(0).version)
    expect(s.lives).toBe(7)
    expect(s.hints).toEqual({ fifty: 2, eraser: 0, skip: 3 })
    expect(s.stats.byLevel.middle.answered).toBe(40)
    expect(s.stats.byLevel.junior.answered).toBe(0)
    expect(s.block.number).toBe(4)
    expect(s.block.results).toEqual([])
    expect(s.progress).toEqual({})
  })
  it("битый JSON — начинаем заново", () => {
    expect(parseState("{oops")).toBeNull()
  })
})
