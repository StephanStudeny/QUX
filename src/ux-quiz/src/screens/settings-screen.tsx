import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Flag } from "@/components/flag"
import { Icon } from "@/components/icon"
import { Segmented } from "@/components/segmented"
import { SwitchRow } from "@/components/switch-row"
import { ENABLED_LANGUAGES, LEVELS, LINKS, type Language } from "@/config/game"
import { useChangeLevel } from "@/hooks/use-change-level"
import { useT } from "@/i18n"
import { usePlatform } from "@/platform"
import { initialState, newBlock, type Settings } from "@/state/game-state"
import { useStore } from "@/state/store"

const LINK_ROWS = [
  { to: "/sources", label: "settings.sources" },
  { to: "/privacy", label: "settings.privacy" },
  { to: "/donate", label: "settings.donate" },
] as const

/** 1.4 Настройки (вход из Профиля): уровень, уведомления, язык, звук/вибрация/пояснения, ссылки, сброс прогресса. */
export function SettingsScreen() {
  const { t, lang } = useT()
  const { state, update } = useStore()
  const platform = usePlatform()

  // Уровень — тот же, что на главной: смена сразу начинает блок заново на выбранном уровне.
  const setLevel = useChangeLevel()

  const setLanguage = (l: Language) => {
    platform.haptic.selection()
    update((s) => ({ ...s, language: l }))
  }
  const toggle = (key: keyof Settings) => async (v: boolean) => {
    if (key !== "haptics" || v) platform.haptic.selection()
    // Уведомление шлёт бот — без разрешения писать игроку включать нечего.
    if (key === "notifyLife" && v && !(await platform.requestWriteAccess())) return
    update((s) => ({ ...s, settings: { ...s.settings, [key]: v } }))
  }

  // 1.4a: нативный попап Telegram «Отмена / Сбросить». Кнопка внизу Настроек (2026-10-04 вернулась из Профиля).
  const reset = async () => {
    const id = await platform.showPopup({
      title: t("settings.reset.title"),
      message: t("settings.reset.message"),
      buttons: [
        { id: "cancel", type: "cancel" },
        { id: "reset", type: "destructive", text: t("settings.reset.confirm") },
      ],
    })
    if (id !== "reset") return
    platform.haptic.notification("warning")
    // Сбрасываем игру: статистику, блок, серии и пройденные вопросы. Профиль, настройки, жизни и друзья остаются.
    update((s) => ({
      ...s,
      block: newBlock(1, s.level ?? "middle", s.lives),
      streak: 0,
      seen: [],
      progress: {},
      stats: initialState(Date.now()).stats,
    }))
  }


  return (
    <>
      <h1 className="text-h1 font-bold">{t("settings.title")}</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-small font-medium text-muted-foreground">{t("settings.level")}</h2>
        <Segmented
          label={t("settings.level")}
          value={state.block.level}
          onChange={setLevel}
          options={LEVELS.map((l) => ({ value: l, label: t(`level.${l}`) }))}
        />
        <p className="text-caption text-muted-foreground">{t("game.levelNote")}</p>
      </section>

      <div className="card-gradient p-4">
        <SwitchRow label={t("settings.notifyLife")} checked={state.settings.notifyLife} onChange={toggle("notifyLife")} />
      </div>

      <div className="card-gradient flex flex-col gap-3.5 p-4">
        {ENABLED_LANGUAGES.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1 text-button font-medium">{t("settings.language")}</span>
          <Segmented
            stretch={false}
            label={t("settings.language")}
            value={state.language ?? "ru"}
            onChange={setLanguage}
            options={ENABLED_LANGUAGES.map((l) => ({
              value: l,
              label: (
                <>
                  <Flag lang={l} />
                  {l.toUpperCase()}
                </>
              ),
            }))}
          />
        </div>
        )}
        <SwitchRow label={t("settings.sound")} checked={state.settings.sound} onChange={toggle("sound")} />
        <SwitchRow label={t("settings.haptics")} checked={state.settings.haptics} onChange={toggle("haptics")} />
        <SwitchRow
          label={t("settings.showExplanation")}
          checked={state.settings.showExplanation}
          onChange={toggle("showExplanation")}
        />
      </div>

      <nav className="card-gradient flex flex-col gap-3.5 p-4">
        {/* Донаты скрыты, пока не прикреплён сбор (LINKS.donate). */}
        {LINK_ROWS.filter((row) => row.to !== "/donate" || LINKS.donate).map((row) => (
          <Link
            key={row.to}
            to={row.to}
            onClick={(e) => {
              // Донаты: если сбор прикреплён — открываем его, иначе заглушка /donate.
              if (row.to === "/donate" && LINKS.donate) {
                e.preventDefault()
                platform.openLink(LINKS.donate)
              }
              // Политика — статичная страница рядом с игрой (public/legal), на нужном языке.
              if (row.to === "/privacy") {
                e.preventDefault()
                platform.openLink(new URL(`${LINKS.privacy}-${lang}.html`, document.baseURI).href)
              }
            }}
            className="-my-3 flex min-h-11 items-center gap-3 rounded-md py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="min-w-0 flex-1 text-button font-medium">{t(row.label)}</span>
            <Icon name="chevron-right" className="size-4 text-muted-foreground" />
          </Link>
        ))}
      </nav>

      <Button variant="outline-cta" size="cta" className="text-destructive" onClick={reset}>
        {t("settings.reset")}
      </Button>
    </>
  )
}
