import type { ru } from "./ru"

/** Формы множественного числа по Intl.PluralRules; `other` обязательна. */
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }

type Entry<V> = V extends string ? string : PluralForms

/** Словарь любого языка повторяет ключи русского. */
export type Dictionary = { [K in keyof typeof ru]: Entry<(typeof ru)[K]> }

export type MessageKey = keyof typeof ru

/** Ключи, у которых есть формы множественного числа. */
export type PluralKey = {
  [K in MessageKey]: (typeof ru)[K] extends string ? never : K
}[MessageKey]

export type TextKey = Exclude<MessageKey, PluralKey>

export type Params = Record<string, string | number>
