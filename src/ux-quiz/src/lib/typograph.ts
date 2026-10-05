import type { Language } from "@/config/game"

/**
 * Экранная типографика (редакторские правила), применяется ко всем строкам интерфейса и банку вопросов:
 * — короткие предлоги, союзы и частицы не висят в конце строки (неразрывный пробел после них);
 * — тире не уходит в начало строки (неразрывный пробел перед ним);
 * — число не отрывается от следующего слова или знака («10 вопросов», «40 ⭐», «5 жизней»);
 * — последнее слово абзаца не остаётся одно, если оно короткое (склеивается с предыдущим).
 * Остальное (одно слово в последней строке длинного абзаца) делает CSS: text-wrap pretty/balance.
 */
const NBSP = " "

/** Слова, после которых перенос запрещён. Сравнение без учёта регистра. */
const SHORT: Record<Language, string[]> = {
  ru: ["а", "в", "во", "и", "к", "ко", "о", "об", "обо", "с", "со", "у", "я", "на", "за", "по", "от", "до", "из", "из-за", "из-под", "не", "ни", "но", "да", "же", "бы", "ли", "под", "над", "при", "про", "без", "для", "это", "как", "или", "что", "чем", "уже", "ещё", "все", "всё"],
  en: ["a", "an", "the", "of", "to", "in", "on", "at", "by", "for", "and", "or", "but", "if", "is", "as", "so", "no", "not", "it", "be", "we", "you", "your", "with", "from", "into"],
}

const sets = Object.fromEntries(Object.entries(SHORT).map(([k, v]) => [k, new Set(v)])) as Record<Language, Set<string>>

/** Короче этого последнее слово абзаца приклеивается к предыдущему. */
const TAIL_MAX = 6

export function typograph(text: string, lang: Language): string {
  if (!text || !text.includes(" ")) return text
  const short = sets[lang]
  // Абзацы обрабатываем по отдельности: переводы строк сохраняем.
  return text
    .split("\n")
    .map((line) => {
      const words = line.split(" ")
      let out = ""
      for (let i = 0; i < words.length; i++) {
        const w = words[i]
        out += w
        if (i === words.length - 1) break
        const next = words[i + 1]
        const bare = w.replace(/^[«"(“„]+/, "").toLowerCase()
        const glue =
          short.has(bare) || // висячий предлог/союз
          /^[—–]$/.test(next) || // перед тире
          /^\d[\d.,:/%×]*$/.test(w) || // число + следующее слово/знак
          /^[№§]$/.test(w) ||
          (i === words.length - 2 && next.replace(/[.,!?…:;»"”)]+$/, "").length <= TAIL_MAX && words.length > 3) // короткий хвост абзаца
        out += glue ? NBSP : " "
      }
      return out
    })
    .join("\n")
}
