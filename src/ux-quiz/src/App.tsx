import { useEffect } from "react"
import { HashRouter, Navigate, Route, Routes } from "react-router-dom"
import { LanguageModal } from "@/components/language-modal"
import { AppShell } from "@/components/layout/app-shell"
import { ShellLayout } from "@/components/layout/shell-layout"
import { ENABLED_LANGUAGES, type Language } from "@/config/game"
import { I18nProvider, useT } from "@/i18n"
import { usePlatform } from "@/platform"
import { BoostScreen } from "@/screens/boost-screen"
import { GameScreen } from "@/screens/game-screen"
import { HomeSkeleton } from "@/screens/home-skeleton"
import { InviteScreen } from "@/screens/invite-screen"
import { NicknameModal } from "@/components/profile/nickname-modal"
import { LevelPickScreen } from "@/screens/level-pick-screen"
import { ProfileScreen } from "@/screens/profile-screen"
import { BlockResultsScreen } from "@/screens/quiz/block-results-screen"
import { LivesOutScreen } from "@/screens/quiz/lives-out-screen"
import { QuizScreen } from "@/screens/quiz/quiz-screen"
import { ReviewScreen } from "@/screens/quiz/review-screen"
import { SuperIntroScreen } from "@/screens/quiz/super-intro-screen"
import { SettingsScreen } from "@/screens/settings-screen"
import { SourcesScreen } from "@/screens/sources-screen"
import { StubScreen } from "@/screens/stub-screen"
import { StoreProvider, useStoreStatus } from "@/state/store"

function TabRoutes() {
  const { t } = useT()
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<GameScreen />} />
        <Route path="settings" element={<SettingsScreen />} />
        <Route path="boost" element={<BoostScreen />} />
        <Route path="profile" element={<ProfileScreen />} />
        <Route path="invite" element={<InviteScreen />} />
        <Route path="sources" element={<SourcesScreen />} />
        <Route path="privacy" element={<StubScreen title={t("settings.privacy")} />} />
        <Route path="donate" element={<StubScreen title={t("settings.donate")} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      {/* Квиз — без Tab Bar, «Назад» Telegram ведёт к попапу выхода / на главную. */}
      <Route path="quiz" element={<QuizScreen />} />
      <Route path="quiz/super-intro" element={<SuperIntroScreen />} />
      <Route path="quiz/results" element={<BlockResultsScreen />} />
      <Route path="lives-out" element={<LivesOutScreen />} />
      <Route path="review" element={<ReviewScreen />} />
    </Routes>
  )
}

/** 4.6: загрузка прогресса не удалась — нативный попап «Закрыть / Повторить». */
function OfflinePopup() {
  const { t } = useT()
  const platform = usePlatform()
  const { retry } = useStoreStatus()
  useEffect(() => {
    let alive = true
    platform
      .showPopup({
        title: t("offline.title"),
        message: t("offline.message"),
        buttons: [
          { id: "close", type: "close" },
          { id: "retry", type: "default", text: t("offline.retry") },
        ],
      })
      .then((id) => {
        if (!alive) return
        if (id === "retry") retry()
        else platform.close()
      })
    return () => {
      alive = false
    }
  }, [platform, retry, t])
  return null
}

/**
 * Порядок запуска: загрузка (4.1 скелетон) → ошибка сети (4.6) → выбор языка (4.0, поверх скелетона)
 * → выбор уровня (4.2) → вкладки.
 */
function Root() {
  const { status, state, update } = useStoreStatus()
  const platform = usePlatform()
  const guess = platform.user?.languageCode?.slice(0, 2) as Language | undefined
  const lang: Language =
    state?.language ?? (guess && ENABLED_LANGUAGES.includes(guess) ? guess : ENABLED_LANGUAGES[0])

  // Доступен один язык — выбор (4.0) пропускаем и ставим его сам.
  useEffect(() => {
    if (status === "ready" && state && (!state.language || !ENABLED_LANGUAGES.includes(state.language)) && ENABLED_LANGUAGES.length === 1) {
      update((s) => ({ ...s, language: ENABLED_LANGUAGES[0] }))
    }
  }, [status, state, update])

  let content
  if (status !== "ready" || !state?.language) {
    // Модалки — вне inert-рамки скелетона, иначе они не получат фокус и нажатия.
    content = (
      <>
        <ShellLayout inert>
          <HomeSkeleton />
        </ShellLayout>
        {status === "error" && <OfflinePopup />}
        {status === "ready" && !state?.language && ENABLED_LANGUAGES.length > 1 && (
          <LanguageModal
            onPick={(l) => {
              platform.haptic.selection()
              update((s) => ({ ...s, language: l }))
            }}
          />
        )}
      </>
    )
  } else if (!state.nickname && !platform.user?.firstName.trim()) {
    // Telegram не отдал имя — спрашиваем при входе (до выбора уровня); дальше его можно сменить в Профиле.
    content = (
      <>
        <ShellLayout inert>
          <HomeSkeleton />
        </ShellLayout>
        <NicknameModal
          open
          required
          value=""
          onCancel={() => {}}
          onSave={(nick) => {
            platform.haptic.notification("success")
            update((s) => ({ ...s, nickname: nick }))
          }}
        />
      </>
    )
  } else if (!state.level) {
    content = <LevelPickScreen />
  } else {
    content = <TabRoutes />
  }

  return <I18nProvider lang={lang}>{content}</I18nProvider>
}

export default function App() {
  return (
    <HashRouter>
      <StoreProvider>
        <Root />
      </StoreProvider>
    </HashRouter>
  )
}
