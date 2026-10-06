import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { useBackendSync } from "@/api/sync"
import { usePlatform } from "@/platform"
import { mockDemo, mockScenario } from "@/platform/mock"
import { applyRegen } from "./lives"
import { restartBlock } from "@/quiz/engine"
import { applyDemo, initialState, mockState, parseState, STATE_KEY, type GameState } from "./game-state"

export type LoadStatus = "loading" | "ready" | "error"

interface StoreValue {
  status: LoadStatus
  state: GameState | null
  /** Иммутабельное обновление + сохранение (WebView могут убить в любой момент). */
  update: (fn: (s: GameState) => GameState) => void
  /** Повторить загрузку после ошибки сети (4.6 «Повторить»). */
  retry: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

/**
 * Загружает прогресс из хранилища платформы (CloudStorage / localStorage).
 * В браузере без сохранения — мок из макетов; `?fresh` — первый запуск.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const platform = usePlatform()
  const [state, setState] = useState<GameState | null>(null)
  const [status, setStatus] = useState<LoadStatus>("loading")
  const [attempt, setAttempt] = useState(0)
  const loaded = useRef(false)

  useEffect(() => {
    let cancelled = false
    const now = Date.now()
    platform.storage
      .get(STATE_KEY)
      .then((raw) => {
        if (cancelled) return
        const fallback =
          platform.kind === "browser" && mockScenario === "demo" ? applyDemo(mockState(now), mockDemo) : initialState(now)
        const parsed = parseState(raw)
        // Закрыл приложение посреди блока — как «Выйти»: блок сгорает и начинается заново (правка Степана 2026-10-05).
        const saved = parsed
          ? parsed.block.phase === "regular" && parsed.block.results.length > 0
            ? restartBlock(parsed)
            : parsed
          : fallback
        const regen = applyRegen(saved.lives, saved.livesAnchor, now)
        // Друзья — данные бэкенда; из сохранения их не тянем (там мог остаться старый демо-список). Исключение — `?demo=friends`.
        setState({ ...saved, friends: parsed ? [] : saved.friends, lives: regen.lives, livesAnchor: regen.anchor })
        setStatus("ready")
        loaded.current = true
      })
      .catch(() => {
        if (!cancelled) setStatus("error")
      })
    return () => {
      cancelled = true
    }
  }, [platform, attempt])

  useEffect(() => {
    if (state && loaded.current) platform.storage.set(STATE_KEY, JSON.stringify(state)).catch(() => {})
  }, [platform, state])

  const update = useCallback((fn: (s: GameState) => GameState) => setState((s) => (s ? fn(s) : s)), [])
  const retry = useCallback(() => {
    setStatus("loading")
    setAttempt((a) => a + 1)
  }, [])
  useBackendSync(platform, state, update)

  return <StoreContext.Provider value={{ status, state, update, retry }}>{children}</StoreContext.Provider>
}

/** Статус загрузки — для корня приложения (скелетон, ошибка сети, первый запуск). */
export function useStoreStatus(): StoreValue {
  const s = useContext(StoreContext)
  if (!s) throw new Error("useStoreStatus вне StoreProvider")
  return s
}

/** Прогресс для экранов — вызывается только после загрузки. */
export function useStore(): { state: GameState; update: StoreValue["update"] } {
  const s = useStoreStatus()
  if (!s.state) throw new Error("useStore до загрузки прогресса")
  return { state: s.state, update: s.update }
}
