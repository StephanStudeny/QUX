import { useEffect } from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { usePlatform } from "@/platform"
import { ShellLayout } from "./shell-layout"

/** Корневые вкладки: «Назад» Telegram с них ведёт на «Игру». */
const TAB_ROOTS = new Set(["/boost", "/profile"])
/** Фоновая картинка вместо «Светового пятна»: Игра — команда без наград (1.1), Профиль — пустой офис (1.2), Буст — обложка с наградами (1.3). */
const BG: Record<string, "team" | "office" | "cover"> = { "/": "team", "/profile": "office", "/boost": "cover" }

/**
 * Каркас вкладок. На «Игре» в шапке «Закрыть», на остальных — BackButton:
 * с вкладки → «Игра», с вложенного экрана → назад по истории.
 */
export function AppShell() {
  const platform = usePlatform()
  const location = useLocation()
  const navigate = useNavigate()
  const { pathname } = location

  useEffect(() => {
    if (pathname === "/") {
      platform.backButton.hide()
      return
    }
    platform.backButton.show(() => {
      if (TAB_ROOTS.has(pathname) || location.key === "default") navigate("/", { replace: true })
      else navigate(-1)
    })
  }, [platform, pathname, location.key, navigate])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <ShellLayout spot={BG[pathname] ?? "violet"}>
      <Outlet />
    </ShellLayout>
  )
}
