import { useEffect, useRef } from "react"
import { Flag } from "@/components/flag"
import { ENABLED_LANGUAGES, type Language } from "@/config/game"

const NAMES: Record<Language, string> = { ru: "Русский", en: "English" }

/**
 * 4.0 Первый запуск — выбор языка: модалка без текста с двумя флагами 112×112.
 * Тап по флагу сразу выбирает язык; закрыть без выбора нельзя (Esc заблокирован).
 * Подписи — только для скринридера, на языке самого варианта.
 */
export function LanguageModal({ onPick }: { onPick: (l: Language) => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      aria-label="Язык / Language"
      onCancel={(e) => e.preventDefault()}
      className="card-gradient m-auto rounded-[20px] p-6 text-foreground backdrop-blur-[12px] backdrop:bg-background/70 open:animate-in open:fade-in-0 open:zoom-in-95 motion-reduce:open:animate-none"
    >
      <div className="flex gap-4">
        {ENABLED_LANGUAGES.map((l) => (
          <button
            key={l}
            type="button"
            lang={l}
            aria-label={NAMES[l]}
            onClick={() => onPick(l)}
            className="card-gradient flex size-[112px] items-center justify-center outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring active:scale-95 motion-reduce:active:scale-100"
          >
            <Flag lang={l} className="h-12 w-16 rounded-[4px]" />
          </button>
        ))}
      </div>
    </dialog>
  )
}
