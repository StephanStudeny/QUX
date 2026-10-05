import { NavLink, useLocation } from "react-router-dom"
import { Icon, type IconName } from "@/components/icon"
import { useT } from "@/i18n"
import type { TextKey } from "@/i18n/types"
import { usePlatform } from "@/platform"
import { cn } from "@/lib/utils"

/** `nested` — вложенные экраны, на которых вкладка остаётся активной: 1.5 «Друзья» и 1.4 «Настройки» — в Профиле. */
const TABS: { to: string; icon: IconName; label: TextKey; nested?: string[] }[] = [
  { to: "/", icon: "game", label: "tabs.game" },
  { to: "/boost", icon: "boost", label: "tabs.boost" },
  { to: "/profile", icon: "profile", label: "tabs.profile", nested: ["/invite", "/settings", "/sources", "/privacy", "/donate"] },
]

/**
 * R / Tab Bar: только иконки, панель --card, активная вкладка --primary со свечением.
 * Высота 68 = 8 + ячейка 44 + 16; вся ячейка кликабельна, подпись — aria-label.
 */
export function TabBar() {
  const { t } = useT()
  const platform = usePlatform()
  const { pathname } = useLocation()
  return (
    <nav
      aria-label={t("tabs.nav")}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card px-[8px] pt-[8px]"
      style={{ paddingBottom: "max(16px, var(--safe-bottom))" }}
    >
      <ul className="mx-auto flex max-w-[480px]">
        {TABS.map((tab) => {
          const inNested = !!tab.nested?.includes(pathname)
          return (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to}
                end
                replace
                aria-label={t(tab.label)}
                onClick={() => platform.haptic.selection()}
                className={({ isActive }) =>
                  cn(
                    "flex h-[44px] w-full items-center justify-center rounded-md text-muted-foreground outline-none transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring",
                    (isActive || inNested) && "text-primary",
                  )
                }
              >
                {({ isActive }) => (
                  <Icon name={tab.icon} className={cn("size-[24px]", (isActive || inNested) && "glow-tab")} />
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
