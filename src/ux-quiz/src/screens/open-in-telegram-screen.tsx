import { Button } from "@/components/ui/button"
import { LINKS } from "@/config/game"
import { createTranslator } from "@/i18n"

/**
 * Боевая сборка (VITE_TELEGRAM_ONLY=true), открытая в обычном браузере: вместо мока с фейковыми
 * данными и «оплатой» — переход в бота. Макета в Figma пока нет — состав минимальный.
 */
export function OpenInTelegramScreen() {
  const { t } = createTranslator(navigator.language.toLowerCase().startsWith("ru") ? "ru" : "en")
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-h1 font-bold">{t("web.title")}</h1>
      <p className="text-body text-muted-foreground">{t("web.text")}</p>
      <Button variant="cta" size="cta" className="w-full" onClick={() => window.location.assign(`https://t.me/${LINKS.bot}/${LINKS.app}`)}>
        {t("web.open")}
      </Button>
    </main>
  )
}
