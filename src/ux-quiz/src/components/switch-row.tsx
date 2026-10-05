import { cn } from "@/lib/utils"

/**
 * Строка настройки со свитчером 44×26 («Свитчер вкл»: трек --primary, ручка --primary-foreground).
 * Кликабельна вся строка — зона нажатия не меньше 44 px.
 */
export function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="-my-3 flex min-h-11 w-full items-center gap-3 rounded-md py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="min-w-0 flex-1 text-button font-medium">{label}</span>
      <span
        aria-hidden
        className={cn(
          "relative h-[26px] w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-secondary",
        )}
      >
        <span
          className={cn(
            "absolute top-[3px] size-5 rounded-full transition-[left,background-color] motion-reduce:transition-none",
            checked ? "left-[21px] bg-primary-foreground" : "left-[3px] bg-muted-foreground",
          )}
        />
      </span>
    </button>
  )
}
