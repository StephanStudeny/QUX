import { AVATARS, isAvatarId } from "@/config/avatars"
import { cn } from "@/lib/utils"

/**
 * R / Avatar: картинка по cover в круге. Без выбранного аватара — фото из Telegram,
 * а если его нет — круг --muted (как «Плейсхолдер фото» в 1.6).
 */
export function Avatar({
  id,
  photoUrl,
  className,
}: {
  id: string | null
  photoUrl?: string
  className?: string
}) {
  const src = isAvatarId(id) ? AVATARS[id] : photoUrl
  return (
    <span className={cn("block shrink-0 overflow-hidden rounded-full bg-muted", className)}>
      {src && <img src={src} alt="" className="size-full object-cover" draggable={false} />}
    </span>
  )
}
