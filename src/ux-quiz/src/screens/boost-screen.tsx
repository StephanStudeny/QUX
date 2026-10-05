import heart3d from "@/assets/3d/heart.webp"
import { useState } from "react"
import { confirmStarsPayment, createStarsInvoice } from "@/api/backend"
import { LivesStatus } from "@/components/game/lives-status"
import { Icon } from "@/components/icon"
import { GAME, HINT_TYPES, LIFE_PACKS, type LifePack } from "@/config/game"
import { HINT_IMAGES } from "@/config/hints"
import { useT } from "@/i18n"
import type { TextKey } from "@/i18n/types"
import { usePlatform } from "@/platform"
import { applyPack, isBundle } from "@/state/rewards"
import { useStore } from "@/state/store"
import { cn } from "@/lib/utils"

const PACK_DESC: Record<"one" | "three", TextKey> = {
  one: "boost.pack.one",
  three: "boost.pack.three",
}

/** Иконка пакета 48×40: одно сердце 32 / три веером по 26 / сердце + три подсказки (набор). */
function PackIcon({ id }: { id: LifePack["id"] }) {
  return (
    <span aria-hidden className="relative h-10 w-12 shrink-0">
      {id === "one" && <img src={heart3d} alt="" className="absolute top-1 left-2 size-8" />}
      {id === "three" && (
        <>
          <img src={heart3d} alt="" className="absolute top-[5px] left-[3px] size-[26px] -rotate-[18deg]" />
          <img src={heart3d} alt="" className="absolute top-[13px] left-[15px] size-[26px] rotate-[18deg]" />
          <img src={heart3d} alt="" className="absolute top-0.5 left-2.5 size-[26px]" />
        </>
      )}
      {(id === "bundle5" || id === "bundle10") && (
        <>
          <img src={heart3d} alt="" className={cn("absolute top-0 left-1", id === "bundle10" ? "size-9" : "size-8")} />
          {HINT_TYPES.map((h, i) => (
            <img key={h} src={HINT_IMAGES[h]} alt="" className="absolute bottom-0 size-4 object-contain" style={{ left: 18 + i * 10 }} />
          ))}
        </>
      )}
    </span>
  )
}

/** 1.3 Буст: жизни и таймер, пакеты за Stars — поштучные жизни и наборы «жизни + подсказки» (сверх лимита). */
export function BoostScreen() {
  const { t, tp } = useT()
  const { update } = useStore()
  const platform = usePlatform()

  const [pending, setPending] = useState<LifePack["id"] | null>(null)

  /**
   * Покупка: инвойс от сервера → окно оплаты Telegram → сервер подтверждает, что звёзды пришли →
   * только тогда начисляем. Отмена или неподтверждённая оплата — ничего не меняется.
   */
  const buy = async (pack: LifePack) => {
    if (pending) return
    platform.haptic.impact("light")
    try {
      const invoice = await createStarsInvoice(pack, platform)
      const status = await platform.openInvoice(invoice.url)
      if (status !== "paid") return
      setPending(pack.id)
      const confirmed = await confirmStarsPayment(invoice, platform)
      if (!confirmed) {
        await platform.showPopup({ message: t("boost.notConfirmed") })
        return
      }
      update((s) => applyPack(s, pack))
      platform.haptic.notification("success")
    } catch {
      await platform.showPopup({ message: t("boost.unavailable") })
    } finally {
      setPending(null)
    }
  }

  return (
    <>
      {/* Заголовок на одной высоте с «QUX» на главной: там над ним пилюля жизней 28 + промежуток 16 (оба × масштаб) + отступ 0,288 ширины (≤ 138). */}
      <h1 className="pt-[calc(44px*var(--s)_+_min(28.8vw,138px))] text-h1 font-bold">{t("boost.title")}</h1>
      <div className="flex items-center gap-2">
        <LivesStatus />
      </div>
      <p className="text-small text-muted-foreground">
        {t("boost.about", { cap: GAME.livesRegenCap, max: GAME.livesMax })}
      </p>

      {LIFE_PACKS.map((pack) => {
        const available = !pending
        const checking = pending === pack.id
        const title = `+${pack.lives}`
        const desc = isBundle(pack) ? tp("boost.pack.bundle", pack.hints) : t(PACK_DESC[pack.id])
        return (
          <button
            key={pack.id}
            type="button"
            disabled={!available && !checking}
            onClick={() => buy(pack)}
            aria-label={t("boost.pack.a11y", { title, desc, stars: pack.stars })}
            aria-busy={checking}
            className={cn(
              "card-gradient flex items-center gap-3 p-4 text-left outline-none transition-[opacity,transform] focus-visible:ring-2 focus-visible:ring-ring",
              "active:scale-[0.99] disabled:opacity-40 motion-reduce:active:scale-100",
            )}
          >
            <PackIcon id={pack.id} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-1 text-title font-bold">
                {title}
                <Icon name="heart" className="size-3.5 text-heart" />
              </span>
              <span className="text-caption text-muted-foreground">{desc}</span>
            </span>
            {checking ? (
              <span role="status" className="shrink-0 animate-pulse text-caption font-medium text-muted-foreground">
                {t("boost.checking")}
              </span>
            ) : (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-warning/16 px-2.5 py-[5px] text-small font-semibold text-warning">
                <Icon name="star" className="size-3.5" />
                {pack.stars}
              </span>
            )}
          </button>
        )
      })}

    </>
  )
}
