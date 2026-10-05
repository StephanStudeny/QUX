import { useT } from "@/i18n"

/** Временная заглушка для экранов, которые ещё не сверстаны (вкладки 1.2–1.5, квиз). */
export function StubScreen({ title }: { title: string }) {
  const { t } = useT()
  return (
    <section className="flex flex-col gap-1 pt-2">
      <h1 className="text-display font-bold">{title}</h1>
      <p className="text-body text-muted-foreground">{t("stub.soon")}</p>
    </section>
  )
}
