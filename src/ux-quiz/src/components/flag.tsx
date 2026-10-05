import ru from "@/assets/flags/flag-ru.svg"
import us from "@/assets/flags/flag-us.svg"
import type { Language } from "@/config/game"
import { cn } from "@/lib/utils"

/** Флаги языков (компонент `flags` со страницы icons): RU — Россия, EN — США. */
const FLAGS: Record<Language, string> = { ru, en: us }

export function Flag({ lang, className }: { lang: Language; className?: string }) {
  return <img src={FLAGS[lang]} alt="" className={cn("h-[15px] w-5 shrink-0 rounded-[4px] object-cover", className)} />
}
