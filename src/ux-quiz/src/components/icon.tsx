import arrowLeft from "@/assets/icons/arrow-left.svg?raw"
import arrowRight from "@/assets/icons/arrow-right.svg?raw"
import boost from "@/assets/icons/boost.svg?raw"
import check from "@/assets/icons/check.svg?raw"
import chevronRight from "@/assets/icons/chevron-right.svg?raw"
import expand from "@/assets/icons/expand.svg?raw"
import game from "@/assets/icons/game.svg?raw"
import heart from "@/assets/icons/heart.svg?raw"
import moreHorizontal from "@/assets/icons/more-horizontal.svg?raw"
import profile from "@/assets/icons/profile.svg?raw"
import settings from "@/assets/icons/settings.svg?raw"
import star from "@/assets/icons/star.svg?raw"
import timer from "@/assets/icons/timer.svg?raw"
import x from "@/assets/icons/x.svg?raw"
import { cn } from "@/lib/utils"

/**
 * Иконки — только из ДС (Figma «00 Компоненты / Icons», `icon/*`), цвет — currentColor.
 * Символы шрифта и эмодзи вместо иконок не используем.
 */
const ICONS = {
  "arrow-left": arrowLeft,
  "arrow-right": arrowRight,
  boost,
  check,
  "chevron-right": chevronRight,
  expand,
  game,
  heart,
  "more-horizontal": moreHorizontal,
  profile,
  settings,
  star,
  timer,
  x,
} as const

export type IconName = keyof typeof ICONS

/** Размер берётся из исходного SVG (16/20/24), класс `size-*` его переопределяет. Декоративная: подпись — у родителя. */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 [&>svg]:size-full", className)}
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  )
}
