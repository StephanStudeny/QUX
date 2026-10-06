import { Avatar } from "@/components/avatar"
import type { Level } from "@/config/game"
import { useT } from "@/i18n"
import { cn } from "@/lib/utils"

export interface BoardRow {
  id: string
  name: string
  avatar?: string | null
  photoUrl?: string | null
  level?: Level | null
  blocks: number
  self?: boolean
}

/** Друзья выше игрока при равных блоках: «догнал» не значит «обогнал». */
const rank = (rows: BoardRow[]) => [...rows].sort((a, b) => b.blocks - a.blocks || Number(!!a.self) - Number(!!b.self))

/**
 * Профиль 1.2 «Друзья» (макет 308:7048, 320 — 308:7350): игрок и приглашённые друзья по пройденным блокам.
 * Без друзей — только строка игрока и пояснение (308:7093). Размеры масштабируются через --s, как весь экран.
 */
export function FriendsBoard({ self, friends }: { self: BoardRow; friends: BoardRow[] }) {
  const { t, tp } = useT()
  const empty = friends.length === 0
  const rows = empty ? [{ ...self, self: true }] : rank([{ ...self, self: true }, ...friends])

  return (
    <section aria-labelledby="friends-board" className="card-gradient flex flex-col gap-0.5 px-2 pt-4 pb-2">
      <div className="flex items-center gap-2 px-2 pb-1.5">
        <h3 id="friends-board" className="min-w-0 flex-1 text-button font-semibold">
          {t("profile.friends.title")}
        </h3>
        {!empty && <span className="shrink-0 text-small text-muted-foreground">{t("profile.friends.sorted")}</span>}
      </div>

      <ol className="flex flex-col gap-0.5">
        {rows.map((r, i) => {
          const playing = r.self || r.blocks > 0
          return (
            <li
              key={r.id}
              aria-current={r.self || undefined}
              className={cn("flex items-center gap-[calc(12px*var(--s))] p-2", r.self && !empty && "rounded-md bg-accent/14")}
            >
              {!empty && (
                <span className={cn("w-4 shrink-0 text-center text-small font-semibold tabular-nums", r.self ? "text-foreground" : "text-muted-foreground")}>
                  {i + 1}
                </span>
              )}
              <Avatar id={r.avatar} photoUrl={r.photoUrl} initial={r.name.trim().charAt(0).toUpperCase()} className="size-[calc(36px*var(--s))]" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-semibold">
                  {r.name}
                  {r.self && <span className="sr-only"> ({t("profile.friends.you")})</span>}
                </span>
                {playing && r.level && <span className="text-caption text-muted-foreground">{t(`level.${r.level}`)}</span>}
              </div>
              {playing ? (
                <span className="shrink-0 text-right text-small font-medium whitespace-nowrap text-muted-foreground tabular-nums">
                  <span className="font-semibold text-foreground">{r.blocks}</span> {tp("profile.friends.blocks", r.blocks)}
                </span>
              ) : (
                <span className="shrink-0 text-right text-small whitespace-nowrap text-muted-foreground">{t("profile.friends.notPlaying")}</span>
              )}
            </li>
          )
        })}
      </ol>

      {empty && <p className="px-2 pt-1.5 pb-2 text-small text-muted-foreground">{t("profile.friends.empty")}</p>}
    </section>
  )
}
