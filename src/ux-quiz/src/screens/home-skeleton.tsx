import { useT } from "@/i18n"
import { cn } from "@/lib/utils"

const Bar = ({ className }: { className: string }) => <div className={cn("rounded-[6px] bg-muted", className)} />

/**
 * 4.1 Скелетон главной: повторяет раскладку 1.1 плашками --muted.
 * Блик-мерцание (полоса --foreground 6%, наклон 20°) пробегает по карточке блока; без анимации при reduced motion.
 */
export function HomeSkeleton() {
  const { t } = useT()
  return (
    <div role="status" aria-busy="true" aria-label={t("loading")} className="flex flex-col gap-4">
      <div className="flex h-10 items-center gap-2">
        <Bar className="h-7 w-[73px] rounded-full" />
        <Bar className="h-3 w-[87px]" />
        <Bar className="ml-auto h-7 w-[150px] rounded-full" />
      </div>
      <div className="flex flex-col gap-2 pt-2">
        <Bar className="mt-2.5 h-3.5 w-[190px]" />
        <Bar className="mt-3 h-3 w-[270px] max-w-full" />
        <Bar className="h-3 w-[140px]" />
      </div>
      <div className="relative flex flex-col overflow-hidden rounded-lg border border-border bg-card p-4">
        <Bar className="h-3.5 w-[180px]" />
        <Bar className="mt-[17px] h-3 w-[250px] max-w-full" />
        <Bar className="mt-1.5 h-3 w-[150px]" />
        <Bar className="mt-[13px] h-1.5 w-full rounded-full" />
        <Bar className="mt-2.5 h-12 w-full rounded-[14px]" />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 left-0 h-[260px] w-[120px] rotate-[20deg] animate-[shimmer_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-foreground/6 to-transparent motion-reduce:animate-none"
        />
      </div>
      <div className="relative flex h-[74px] items-center rounded-lg border border-border bg-card px-4">
        <div className="flex flex-1 flex-col gap-2">
          <Bar className="h-3.5 w-[150px]" />
          <Bar className="h-3 w-[220px] max-w-full" />
        </div>
        <Bar className="size-4" />
      </div>
    </div>
  )
}
