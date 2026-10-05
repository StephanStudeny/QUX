import { describe, expect, it } from "vitest"
import { typograph } from "@/lib/typograph"

const N = " "

describe("typograph", () => {
  it("предлоги и союзы не висят в конце строки", () => {
    expect(typograph("Проверьте знания на простых вопросах и в игре", "ru")).toBe(`Проверьте знания на${N}простых вопросах и${N}в${N}игре`)
  })
  it("тире не уходит в начало строки, число держится со словом", () => {
    expect(typograph("Блок 3 — вопрос 4 из 10", "ru")).toBe(`Блок 3${N}— вопрос 4${N}из${N}10`)
    expect(typograph("+5 жизней за друга", "ru")).toBe(`+5 жизней за${N}друга`)
  })
  it("короткий хвост абзаца приклеивается, длинный — нет", () => {
    expect(typograph("Вперёд: узнаем, насколько вы в теме!", "ru")).toContain(`в${N}теме!`)
    expect(typograph("A pretty UI won't save a clumsy flow.", "en")).toBe(`A${N}pretty UI won't save a${N}clumsy${N}flow.`)
  })
  it("переводы строк сохраняются, пустая строка и одно слово — без изменений", () => {
    expect(typograph("и раз\nи два", "ru")).toBe(`и${N}раз\nи${N}два`)
    expect(typograph("", "ru")).toBe("")
    expect(typograph("Слово", "ru")).toBe("Слово")
  })
})
