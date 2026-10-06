import { AVATARS, isAvatarId } from "@/config/avatars"
import { cn } from "@/lib/utils"

/**
 * R / Avatar: картинка по cover в круге. Без выбранного аватара — фото из Telegram,
 * а если его нет — круг --muted (как «Плейсхолдер фото» в 1.6), с инициалом, если он передан.
 */
export function Avatar({
  id,
  photoUrl,
  initial,
  className,
}: {
  id: string | null | undefined
  photoUrl?: string | null
  /** Буква в заглушке без картинки (строка друга в профиле). */
  initial?: string
  className?: string
}) {
  const src = isAvatarId(id) ? AVATARS[id] : photoUrl
  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted", className)}>
      {src ? (
        <img src={src} alt="" className="size-full object-cover" draggable={false} />
      ) : (
        initial && <span className="text-small font-semibold text-muted-foreground">{initial}</span>
      )}
    </span>
  )
}
