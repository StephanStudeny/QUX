import { useId, useState } from "react"
import { ModalCard } from "@/components/modal-card"
import { Button } from "@/components/ui/button"
import { useT } from "@/i18n"

/** Длина никнейма — как имя в Telegram (до 24 символов, чтобы помещался в шапку профиля). */
export const NICKNAME_MAX = 24

/**
 * «Сменить никнейм» (1.2a): поле сразу с текущим именем, «Отменить» / «Переименовать».
 * `required` — первый вход, когда Telegram не отдал имя: «Как вас зовут?», закрыть нельзя.
 * Пустое имя не сохраняется; Enter = сохранить.
 */
export function NicknameModal({
  open,
  value,
  onCancel,
  onSave,
  required = false,
}: {
  open: boolean
  value: string
  required?: boolean
  onCancel: () => void
  onSave: (name: string) => void
}) {
  const { t } = useT()
  const inputId = useId()
  const [draft, setDraft] = useState(value)
  // Черновик сбрасывается к текущему значению при открытии — прямо в рендере, без лишнего прохода эффекта.
  const [synced, setSynced] = useState({ open, value })
  if (synced.open !== open || synced.value !== value) {
    setSynced({ open, value })
    if (open) setDraft(value)
  }
  const name = draft.trim()

  return (
    <ModalCard open={open} onClose={required ? () => {} : onCancel} labelledBy="nickname-title">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (name) onSave(name)
        }}
      >
        <h2 id="nickname-title" className="text-h2 font-bold">
          {t(required ? "nickname.askTitle" : "nickname.title")}
        </h2>
        <label htmlFor={inputId} className="sr-only">
          {t("nickname.label")}
        </label>
        <input
          id={inputId}
          autoFocus
          value={draft}
          maxLength={NICKNAME_MAX}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("nickname.placeholder")}
          autoComplete="nickname"
          enterKeyHint="done"
          className="h-12 rounded-[12px] border border-input bg-muted px-4 text-button text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <div className="flex gap-2">
          {!required && (
            <Button type="button" variant="outline-cta" size="cta" className="flex-1" onClick={onCancel}>
              {t("nickname.cancel")}
            </Button>
          )}
          <Button type="submit" variant="cta" size="cta" className="flex-1" disabled={!name}>
            {t(required ? "nickname.askSave" : "nickname.save")}
          </Button>
        </div>
      </form>
    </ModalCard>
  )
}
