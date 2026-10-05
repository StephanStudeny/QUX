import { useSyncExternalStore } from "react"
import { Icon } from "@/components/icon"
import { useT } from "@/i18n"
import { mockChrome } from "@/platform/mock"

/**
 * Имитация нативной шапки Telegram (TG Header) — только в браузере.
 * В Telegram её рисует сам клиент; кнопка «Назад» там — BackButton.
 */
export function MockTgHeader() {
  const { t } = useT()
  const { back } = useSyncExternalStore(mockChrome.subscribe, mockChrome.get)
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-[56px] items-center gap-[12px] border-b border-border bg-background px-[16px]">
      {back ? (
        <button type="button" onClick={back} aria-label={t("tg.back")} className="-ml-[10px] flex size-[44px] items-center justify-center rounded-md">
          <Icon name="arrow-left" className="size-[24px]" />
        </button>
      ) : (
        <button type="button" aria-label={t("tg.close")} className="-ml-[12px] flex size-[44px] items-center justify-center rounded-md">
          <Icon name="x" className="size-[20px]" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px]/[22px] font-semibold">{t("app.name")}</p>
        <p className="truncate text-[12px]/[16px] text-muted-foreground">{t("tg.miniApp")}</p>
      </div>
      <button type="button" aria-label={t("tg.more")} className="-mr-[10px] flex size-[44px] items-center justify-center rounded-md">
        <Icon name="more-horizontal" className="size-[24px]" />
      </button>
    </header>
  )
}
