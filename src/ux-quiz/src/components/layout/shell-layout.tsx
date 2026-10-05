import type { CSSProperties, ReactNode } from "react"
import coverBg from "@/assets/bg/cover.webp"
import goldSpot from "@/assets/icons/gold-spot.svg"
import lightSpot from "@/assets/icons/light-spot.svg"
import officeBg from "@/assets/bg/office.webp"
import teamBg from "@/assets/bg/team.webp"
import { usePlatform } from "@/platform"
import { cn } from "@/lib/utils"
import { MockMainButton } from "./mock-main-button"
import { MockPopupHost } from "./mock-popup-host"
import { MockTgHeader } from "./mock-tg-header"
import { TabBar } from "./tab-bar"

/**
 * Рамка экрана: «Световое пятно», шапка Telegram (в браузере — мок), контент, Tab Bar.
 * `tabBar={false}` — экраны без нижнего меню (4.2, квиз); `inert` — скелетон, пока грузимся.
 */
export function ShellLayout({
  children,
  tabBar = true,
  inert = false,
  spot = "violet",
  className,
}: {
  children: ReactNode
  tabBar?: boolean
  inert?: boolean
  /**
   * Декор у верхнего края: «Световое пятно» фиолетовое (--bg-spot) или золотое (--warning) у супервикторины;
   * `office` — фоновая картинка офиса 16:9 под шапкой, растворяется в --background (Профиль);
   * `team` — та же сцена с командой зверей без наград (Игра, вопрос без иллюстрации);
   * `cover` — обложка: команда с наградами (Буст, макет 1.3).
   */
  spot?: "violet" | "gold" | "office" | "team" | "cover"
  className?: string
}) {
  const platform = usePlatform()
  const isMock = platform.kind === "browser"
  return (
    <div
      className="relative min-h-dvh overflow-x-clip"
      style={
        {
          "--tg-header-h": isMock ? "56px" : "0px",
          "--tab-bar-h": tabBar ? "68px" : "0px",
        } as CSSProperties
      }
    >
      {/* «Световое пятно»: размытый эллипс у верхнего края, только декор. Золотое опущено к звезде. */}
      {spot === "office" || spot === "team" || spot === "cover" ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[var(--tg-header-h)] aspect-video bg-cover bg-center select-none"
          style={{ backgroundImage: `linear-gradient(to bottom, transparent, var(--background)), url(${{ team: teamBg, office: officeBg, cover: coverBg }[spot]})` }}
        />
      ) : spot === "violet" ? (
        <img
          src={lightSpot}
          alt=""
          aria-hidden
          className="pointer-events-none absolute top-[-240px] left-[calc(50%-380px)] h-[620px] w-[760px] max-w-none select-none"
        />
      ) : (
        <img
          src={goldSpot}
          alt=""
          aria-hidden
          className="pointer-events-none absolute top-[-110px] left-[calc(50%-380px)] h-[560px] w-[760px] max-w-none select-none"
        />
      )}
      {isMock && <MockTgHeader />}
      <main
        inert={inert}
        className={cn("relative mx-auto flex min-h-dvh max-w-[480px] flex-col gap-4 px-4", className)}
        style={{
          paddingTop: "calc(var(--tg-header-h) + 12px)",
          paddingBottom: "calc(var(--tab-bar-h) + var(--safe-bottom) + 16px)",
        }}
      >
        {children}
      </main>
      {tabBar && (
        <div inert={inert}>
          <TabBar />
        </div>
      )}
      {isMock && <MockMainButton />}
      {isMock && <MockPopupHost />}
    </div>
  )
}
