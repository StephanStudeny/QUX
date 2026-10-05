import { backendEnabled, claimFriendReward, fetchFriends } from "@/api/backend"
import { useEffect, useState } from "react"
import heart3d from "@/assets/3d/heart.webp"
import { CenterModal } from "@/components/center-modal"
import { Icon } from "@/components/icon"
import { Button } from "@/components/ui/button"
import { GAME, HINT_TYPES, LINKS } from "@/config/game"
import { HINT_IMAGES } from "@/config/hints"
import { useT } from "@/i18n"
import { usePlatform } from "@/platform"
import type { Friend } from "@/state/game-state"
import { claimFriend, isQualified } from "@/state/rewards"
import { useStore } from "@/state/store"

/** Реферальная ссылка Mini App: t.me/<bot>/<app>?startapp=ref_<id>. */
const inviteLink = (userId: number | undefined) =>
  `https://t.me/${LINKS.bot}/${LINKS.app}?startapp=ref_${userId ?? 0}`

/** 1.5 Пригласить друга (+ 1.5a пусто, 1.5b модалка награды). */
export function InviteScreen() {
  const { t } = useT()
  const { state, update } = useStore()
  const platform = usePlatform()
  const [claimed, setClaimed] = useState<Friend | null>(null)
  const [copied, setCopied] = useState(false)

  const { friends } = state
  const done = friends.filter((f) => isQualified(f.progress)).length
  const link = inviteLink(platform.user?.id)

  // Друзья и их прогресс — с сервера при каждом открытии экрана.
  useEffect(() => {
    if (!backendEnabled()) return
    let cancelled = false
    fetchFriends(platform)
      .then(({ friends }) => !cancelled && update((s) => ({ ...s, friends })))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [platform, update])

  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(id)
  }, [copied])

  /** С сервером награду сначала подтверждает бэкенд (друг прошёл первый блок, награда ещё не забрана). */
  const claim = async (f: Friend) => {
    if (backendEnabled() && !(await claimFriendReward(platform, f.id))) {
      await platform.showPopup({ message: t("invite.claimFailed") })
      return
    }
    update((s) => claimFriend(s, f.id))
    platform.haptic.notification("success")
    setClaimed(f)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      platform.haptic.notification("success")
    } catch {
      /* буфер недоступен — ссылку всё равно можно отправить кнопкой выше */
    }
  }

  const rewards = [
    { key: "lives", img: heart3d, label: t("invite.lives"), value: GAME.friendRewardLives },
    ...HINT_TYPES.map((h) => ({ key: h, img: HINT_IMAGES[h], label: t(`hint.${h}`), value: GAME.friendRewardHintsPerType })),
  ]

  return (
    <div className="flex min-h-[calc(100dvh-var(--tg-header-h)-var(--tab-bar-h)-var(--safe-bottom)-28px)] flex-col gap-4">
      <h1 className="text-h1 font-bold">{t("invite.title")}</h1>
      <p className="text-body text-muted-foreground">{t("invite.about", { size: GAME.blockSize })}</p>

      <section aria-labelledby="reward-title" className="card-gradient flex flex-col gap-2.5 p-4">
        <h2 id="reward-title" className="text-button font-semibold">
          {t("invite.reward")}
        </h2>
        <ul className="flex flex-col gap-2.5">
          {rewards.map((r) => (
            <li key={r.key} className="flex items-center gap-2.5">
              <img src={r.img} alt="" className="size-6 object-contain" />
              <span className="min-w-0 flex-1 text-body font-medium">{r.label}</span>
              <span className="text-body font-semibold text-success">+{r.value}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="friends-title" className="card-gradient flex flex-col gap-2.5 p-4">
        <div className="flex items-center gap-2">
          <h2 id="friends-title" className="min-w-0 flex-1 text-button font-semibold">
            {t("invite.yours")}
          </h2>
          <span className="shrink-0 text-small text-muted-foreground">
            {friends.length ? t("invite.counted", { done, total: friends.length }) : t("invite.none")}
          </span>
        </div>

        {friends.length === 0 ? (
          <p className="text-body text-muted-foreground">{t("invite.empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {friends.map((f) => (
              <li key={f.id} className="flex min-h-5 items-center gap-2.5">
                <span className="min-w-0 flex-1 truncate text-body font-medium">{f.name}</span>
                {f.claimed ? (
                  <span className="flex items-center gap-1 text-small font-semibold text-muted-foreground">
                    <Icon name="check" className="size-3.5" />
                    {t("invite.received")}
                  </span>
                ) : isQualified(f.progress) ? (
                  <button
                    type="button"
                    onClick={() => claim(f)}
                    aria-label={t("invite.claimA11y", { name: f.name })}
                    className="relative rounded-[10px] bg-primary px-3.5 py-2 text-small font-semibold text-primary-foreground outline-none after:absolute after:-inset-y-1 after:inset-x-0 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
                  >
                    {t("invite.claim")}
                  </button>
                ) : (
                  <span className="text-small text-muted-foreground">
                    {f.progress > 0
                      ? t("invite.progress", { done: f.progress, total: GAME.blockSize })
                      : t("invite.notStarted")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-auto flex flex-col gap-2">
        <Button
          variant="cta"
          size="cta"
          onClick={() => {
            platform.haptic.impact("light")
            platform.shareLink(link, t("invite.shareText"))
          }}
        >
          {t("invite.share")}
        </Button>
        <Button variant="outline-cta" size="cta" onClick={copy} aria-live="polite">
          {copied ? t("invite.copied") : t("invite.copy")}
        </Button>
      </div>

      <CenterModal open={claimed !== null} onClose={() => setClaimed(null)} labelledBy="friend-reward-title" icon={heart3d}>
        <h2 id="friend-reward-title" className="text-h1 font-bold">
          {claimed && t("invite.modal.title", { name: claimed.name })}
        </h2>
        <ul className="flex flex-wrap justify-center gap-1.5">
          {rewards.map((r) => (
            <li key={r.key} className="flex items-center gap-1 rounded-full bg-accent/16 py-1.5 pr-2.5 pl-2 text-button font-semibold">
              <img src={r.img} alt="" className="size-6 object-contain" />
              <span aria-label={`${r.label} +${r.value}`}>+{r.value}</span>
            </li>
          ))}
        </ul>
        <p className="text-body text-muted-foreground">{t("invite.modal.text")}</p>
        <Button variant="cta" size="cta" autoFocus onClick={() => setClaimed(null)}>
          {t("invite.modal.ok")}
        </Button>
      </CenterModal>
    </div>
  )
}
