import { useState } from "react"
import check3d from "@/assets/3d/check.webp"
import { Avatar } from "@/components/avatar"
import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import { AVATAR_IDS, type AvatarId } from "@/config/avatars"
import { useT } from "@/i18n"
import { usePlatform } from "@/platform"
import { cn } from "@/lib/utils"

/**
 * 1.6 Выбор аватара: сетка 4×3 по 72 px, «Фото из Telegram», «Готово».
 * Выбор черновой — сохраняется только по «Готово».
 */
export function AvatarSheet({
  open,
  value,
  onClose,
  onSave,
}: {
  open: boolean
  value: string | null
  onClose: () => void
  onSave: (id: AvatarId | null) => void
}) {
  const { t } = useT()
  const platform = usePlatform()
  const [draft, setDraft] = useState<string | null>(value)

  // Черновик сбрасывается к текущему значению при открытии — прямо в рендере, без лишнего прохода эффекта.
  const [synced, setSynced] = useState({ open, value })
  if (synced.open !== open || synced.value !== value) {
    setSynced({ open, value })
    if (open) setDraft(value)
  }

  const pick = (id: AvatarId | null) => {
    platform.haptic.selection()
    setDraft(id)
  }

  return (
    <BottomSheet open={open} onClose={onClose} labelledBy="avatar-title" height={540}>
      <h2 id="avatar-title" className="text-h2 font-bold">
        {t("avatar.title")}
      </h2>

      <div role="radiogroup" aria-labelledby="avatar-title" className="flex flex-col gap-4">
        <div className="grid grid-cols-4 justify-items-center gap-3">
          {AVATAR_IDS.map((id) => {
            const selected = draft === id
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                autoFocus={selected}
                aria-label={t(`avatar.${id}`)}
                onClick={() => pick(id)}
                className="relative aspect-square w-full max-w-[72px] rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                <Avatar
                  id={id}
                  className={cn(
                    "size-full transition-shadow",
                    selected && "shadow-[0_0_12px_0_var(--glow-success)]",
                  )}
                />
                {/* Обводка поверх картинки (stroke INSIDE в Figma) */}
                {selected && <span aria-hidden className="absolute inset-0 rounded-full ring-2 ring-primary ring-inset" />}
                {selected && <img src={check3d} alt="" className="absolute top-[72%] left-[75%] size-[28%]" />}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          role="radio"
          aria-checked={draft === null}
          onClick={() => pick(null)}
          className="-my-1.5 flex min-h-11 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="relative">
            <Avatar id={null} photoUrl={platform.user?.photoUrl} className="size-8" />
            {draft === null && <span aria-hidden className="absolute inset-0 rounded-full ring-2 ring-primary ring-inset" />}
          </span>
          <span className="text-button font-medium">{t("avatar.tgPhoto")}</span>
        </button>
      </div>

      <Button
        variant="cta"
        size="cta"
        className="mt-auto"
        onClick={() => {
          platform.haptic.impact("light")
          onSave(draft as AvatarId | null)
        }}
      >
        {t("avatar.done")}
      </Button>
    </BottomSheet>
  )
}
