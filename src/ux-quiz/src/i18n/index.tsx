import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react"
import type { Language } from "@/config/game"
import { typograph } from "@/lib/typograph"
import { en } from "./en"
import { ru } from "./ru"
import type { Dictionary, Params, PluralKey, TextKey } from "./types"

const DICTIONARIES: Record<Language, Dictionary> = { ru, en }

const fill = (template: string, params?: Params) =>
  params ? template.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : template

/** Переводчик: `t` — обычная строка, `tp` — строка с формой множественного числа по `count`. */
export interface Translator {
  lang: Language
  t: (key: TextKey, params?: Params) => string
  tp: (key: PluralKey, count: number, params?: Params) => string
}

export function createTranslator(lang: Language): Translator {
  const dict = DICTIONARIES[lang]
  const plural = new Intl.PluralRules(lang)
  return {
    lang,
    // Экранная типографика — на готовой строке (после подстановки чисел: «10 вопросов» не рвётся).
    t: (key, params) => typograph(fill(dict[key] as string, params), lang),
    tp: (key, count, params) => {
      const forms = dict[key]
      const form = forms[plural.select(count)] ?? forms.other
      return typograph(fill(form, { count, ...params }), lang)
    },
  }
}

const I18nContext = createContext<Translator>(createTranslator("ru"))

/** Даёт словарь выбранного языка и синхронизирует `<html lang>`. */
export function I18nProvider({ lang, children }: { lang: Language; children: ReactNode }) {
  const value = useMemo(() => createTranslator(lang), [lang])
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useT = () => useContext(I18nContext)
