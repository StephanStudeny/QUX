import { useEffect, useRef } from "react"
import { usePlatform } from "@/platform"

/** Кнопка «Назад» Telegram (в браузере — в мок-шапке) с актуальным обработчиком. */
export function useBackButton(handler: () => void) {
  const platform = usePlatform()
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })
  useEffect(() => {
    platform.backButton.show(() => ref.current())
    return () => platform.backButton.hide()
  }, [platform])
}
