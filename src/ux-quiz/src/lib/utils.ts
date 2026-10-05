import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/** tailwind-merge должен знать шкалу text-* из темы, иначе примет её за цвет и выкинет text-<цвет>. */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "h1", "h2", "answer", "title", "button", "body", "small", "caption"] }],
    },
  },
})

/** Склеивает классы и снимает конфликты Tailwind (стандартный хелпер shadcn). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
