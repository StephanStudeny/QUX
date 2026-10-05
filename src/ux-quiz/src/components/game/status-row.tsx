import { LivesStatus } from "./lives-status"

/**
 * Статус главной (макет 1.1, 201:2678): только пилюля жизней «4 / 20», без подложки, таймера и счётчика подсказок
 * (правка Степана 2026-10-05). Таймер следующей жизни — в Бусте.
 */
export function StatusRow() {
  return (
    <div className="flex">
      <LivesStatus timer={false} />
    </div>
  )
}
