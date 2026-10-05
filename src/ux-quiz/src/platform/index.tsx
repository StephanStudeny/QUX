import { createContext, useContext, type ReactNode } from "react"
import { createMockPlatform } from "./mock"
import { createTelegramPlatform, getTelegramWebApp } from "./telegram"
import type { Platform } from "./types"

/** Выбор реализации один раз при старте: Telegram, если открыты в нём, иначе мок. */
export function detectPlatform(): Platform {
  const tg = getTelegramWebApp()
  return tg ? createTelegramPlatform(tg) : createMockPlatform()
}

const PlatformContext = createContext<Platform | null>(null)

export function PlatformProvider({ platform, children }: { platform: Platform; children: ReactNode }) {
  return <PlatformContext.Provider value={platform}>{children}</PlatformContext.Provider>
}

export function usePlatform(): Platform {
  const p = useContext(PlatformContext)
  if (!p) throw new Error("usePlatform вне PlatformProvider")
  return p
}

export type { Platform } from "./types"
