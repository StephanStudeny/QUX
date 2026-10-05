import { useEffect, useState } from "react"
import { LEVELS } from "@/config/game"
import { useT } from "@/i18n"
import { loadBank } from "@/quiz/bank"

/** Сколько источников показывать списком; остальные — «и ещё N». */
const TOP = 15

/** Разные написания одного источника в банке → одно имя (версии и домены склеиваем). */
const ALIASES: [RegExp, string][] = [
  [/^(Material Design( 3)?|m3\.material\.io|Material Symbols)$/i, "Material Design"],
  [/^Scrum Guide( \d{4})?$/i, "Scrum Guide"],
  [/^WCAG( 2\.[\dx])?$/i, "WCAG"],
  [/^Apple( HIG| Accessibility)?$/i, "Apple Human Interface Guidelines"],
]

/** «NN/g, “The Definition of UX”» → «NN/g»: группируем по изданию/автору. */
const origin = (source: string) => {
  const name = source.split(/[,«“"]/)[0].trim()
  return ALIASES.find(([re]) => re.test(name))?.[1] ?? name
}

/**
 * Источники вопросов и лицензии (из Настроек). Список источников считается из банка вопросов,
 * поэтому обновляется вместе с ним; лицензии — шрифт, иконки, библиотеки, иллюстрации.
 */
export function SourcesScreen() {
  const { t } = useT()
  const [top, setTop] = useState<{ name: string; count: number }[] | null>(null)
  const [rest, setRest] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all(LEVELS.map((l) => loadBank(l))).then((banks) => {
      const counts = new Map<string, number>()
      for (const q of banks.flat()) if (q.source) counts.set(origin(q.source), (counts.get(origin(q.source)) ?? 0) + 1)
      const sorted = [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      if (cancelled) return
      setTop(sorted.slice(0, TOP))
      setRest(Math.max(0, sorted.length - TOP))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const licenses = ["sources.lic.inter", "sources.lic.lucide", "sources.lic.libs", "sources.lic.telegram", "sources.lic.art"] as const

  return (
    <>
      <h1 className="text-h1 font-bold">{t("sources.title")}</h1>

      <section className="card-gradient flex flex-col gap-2 p-4">
        <h2 className="text-button font-semibold">{t("sources.about.title")}</h2>
        <p className="text-body">{t("sources.about.text")}</p>
        <p className="text-small text-muted-foreground">{t("sources.about.report")}</p>
      </section>

      <section className="card-gradient flex flex-col gap-2 p-4" aria-busy={!top}>
        <h2 className="text-button font-semibold">{t("sources.list.title")}</h2>
        <ul className="flex flex-col gap-1.5">
          {(top ?? []).map((s) => (
            <li key={s.name} className="flex items-baseline gap-3 text-body">
              <span className="min-w-0 flex-1">{s.name}</span>
              <span className="shrink-0 text-small text-muted-foreground tabular-nums">{t("sources.list.count", { count: s.count })}</span>
            </li>
          ))}
        </ul>
        {rest > 0 && <p className="text-small text-muted-foreground">{t("sources.list.more", { count: rest })}</p>}
      </section>

      <section className="card-gradient flex flex-col gap-2 p-4">
        <h2 className="text-button font-semibold">{t("sources.licenses.title")}</h2>
        <ul className="flex flex-col gap-1.5 text-body">
          {licenses.map((k) => (
            <li key={k}>{t(k)}</li>
          ))}
        </ul>
      </section>

      <section className="card-gradient flex flex-col gap-2 p-4">
        <h2 className="text-button font-semibold">{t("sources.tm.title")}</h2>
        <p className="text-small text-muted-foreground">{t("sources.tm.text")}</p>
      </section>
    </>
  )
}
