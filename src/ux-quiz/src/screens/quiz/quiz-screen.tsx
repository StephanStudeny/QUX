import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import wrong3d from "@/assets/3d/result-wrong.webp"
import star3d from "@/assets/3d/super-star.webp"
import flame3d from "@/assets/3d/streak-flame.webp"
import { CenterModal } from "@/components/center-modal"
import { Icon } from "@/components/icon"
import { ShellLayout } from "@/components/layout/shell-layout"
import { AnswerGrid, type TileState } from "@/components/quiz/answer-grid"
import { Boosters } from "@/components/quiz/boosters"
import { CoachTooltip } from "@/components/quiz/coach-tooltip"
import { GameHeader } from "@/components/quiz/game-header"
import { ResultModal } from "@/components/quiz/result-modal"
import { LevelDoneModal } from "@/components/quiz/level-done-modal"
import { SuperResultModal } from "@/components/quiz/super-result-modal"
import { Button } from "@/components/ui/button"
import { GAME, type HintType } from "@/config/game"
import { HINT_IMAGES } from "@/config/hints"
import { useBackButton } from "@/hooks/use-back-button"
import { useT } from "@/i18n"
import { usePlatform } from "@/platform"
import { findQuestion, loadBank, type Question } from "@/quiz/bank"
import {
  applyRegularOutcome,
  applySuperOutcome,
  hintRemovals,
  markSeen,
  pickQuestion,
  pickRegular,
  restartBlock,
  shuffledOrder,
  spendHint,
  SUPER_SIZE,
  type AnswerEvent,
} from "@/quiz/engine"
import { newBlock, type GameState, type Outcome } from "@/state/game-state"
import { useStore } from "@/state/store"

type Tip = "timer" | "hints" | "lives"

interface Current {
  q: Question
  /** Повтор вопроса с ошибкой (считается в лимит повторов блока). */
  review: boolean
  order: number[]
  removed: number[]
  used: HintType[]
}

const TOTAL_MS = GAME.questionSeconds * 1000

/**
 * Вопрос (2.1–2.7) и вопрос супервикторины (3.3). Сверху вниз: шапка игры → иллюстрация (если есть) →
 * вопрос → ответы 2×2 → подсказки. Нет картинки — блок не показывается вовсе.
 * После ответа: модалка результата (или MainButton «Дальше», если пояснения выключены).
 */
export function QuizScreen() {
  const { t, tp, lang } = useT()
  const { state, update } = useStore()
  const platform = usePlatform()
  const navigate = useNavigate()

  const isSuper = state.block.phase === "super"
  const [cur, setCur] = useState<Current | null>(null)
  const [outcome, setOutcome] = useState<Exclude<Outcome, "skip"> | null>(null)
  const [chosen, setChosen] = useState<number | null>(null)
  const [remaining, setRemaining] = useState(TOTAL_MS)
  const [tip, setTip] = useState<Tip | null>(null)
  const [exiting, setExiting] = useState(false)
  const [event, setEvent] = useState<AnswerEvent | null>(null)
  const [modal, setModal] = useState<"result" | "streak" | "super" | "failed" | "perfect" | null>(null)
  // Пока грузится следующий вопрос (cur = null), держим раскладку прошлого — фон и отступ не мигают.
  const noImageRef = useRef(true)
  if (cur) noImageRef.current = !cur.q.image
  const [explain, setExplain] = useState<Question | null>(null)
  const [imageOpen, setImageOpen] = useState(false)
  const [levelDone, setLevelDone] = useState(false)
  const lastOutcome = useRef<Outcome | null>(null)
  const asked = useRef(0)

  const livesRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<HTMLDivElement>(null)
  const boosterRef = useRef<HTMLButtonElement>(null)

  /**
   * Следующий вопрос нужного пула + решение, какой тултип показать.
   * `fresh` — уже обновлённый прогресс (перезапуск блока, смена уровня), чтобы не ждать ре-рендера.
   */
  const nextQuestion = useCallback(
    async (exclude: string[] = [], fresh?: GameState) => {
      const st = fresh ?? state
      const bank = await loadBank(st.block.level, lang)
      const picked =
        st.block.phase === "super"
          ? { q: pickQuestion(bank, "super", st.seen, exclude), review: false }
          : pickRegular(bank, st, exclude)
      if (!picked) {
        // Все обычные вопросы уровня закрыты — уведомление «Уровень пройден».
        setLevelDone(true)
        return
      }
      const { q, review } = picked
      setCur({ q, review, order: shuffledOrder(), removed: [], used: [] })
      setOutcome(null)
      setChosen(null)
      setRemaining(TOTAL_MS)
      update((s) => ({ ...s, seen: markSeen(s.seen, q.id) }))
      const n = asked.current++
      if (!st.tips.timer) setTip("timer")
      else if (!st.tips.hints && n >= 1) setTip("hints")
      else if (!st.tips.lives && (lastOutcome.current === "wrong" || lastOutcome.current === "timeout")) setTip("lives")
    },
    [state, update, lang],
  )

  /** Начать с первого вопроса на новом прогрессе (перезапуск блока или другой уровень). */
  const startOver = (next: GameState) => {
    update(() => next)
    setEvent(null)
    setModal(null)
    setLevelDone(false)
    lastOutcome.current = null
    if (next.lives <= 0) navigate("/lives-out", { replace: true })
    else void nextQuestion([], next)
  }

  // Первый вопрос при входе. При возврате из паузы — новый (текущий заменяется).
  useEffect(() => {
    if (!cur && state.lives > 0 && (state.block.phase === "regular" || isSuper)) void nextQuestion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Свернули Telegram посреди вопроса — при возврате вопрос заменяется (как выход из блока, без штрафа).
  const hiddenWhileAsking = useRef(false)
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        hiddenWhileAsking.current = !!cur && !outcome && tip === null && !exiting
      } else if (hiddenWhileAsking.current) {
        hiddenWhileAsking.current = false
        if (cur) void nextQuestion([cur.q.id])
      }
    }
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
  }, [cur, outcome, tip, exiting, nextQuestion])

  const paused = tip !== null || exiting || outcome !== null || !cur

  // Таймер вопроса: 40 с, пауза — тултип, попап выхода, показ результата.
  useEffect(() => {
    if (paused) return
    let last = performance.now()
    const id = window.setInterval(() => {
      const now = performance.now()
      const dt = now - last
      last = now
      setRemaining((r) => Math.max(0, r - dt))
    }, 100)
    return () => window.clearInterval(id)
  }, [paused])

  const finish = useCallback(
    (o: Exclude<Outcome, "skip">, pick: number | null) => {
      if (!cur || outcome) return
      setOutcome(o)
      setChosen(pick)
      lastOutcome.current = o
      platform.haptic.notification(o === "correct" ? "success" : "error")
      const now = Date.now()
      // Исход считаем от текущего прогресса один раз: в нём случайная подсказка за серию.
      const r = isSuper ? applySuperOutcome(state, cur.q, o, now) : applyRegularOutcome(state, cur.q, o, now, cur.review)
      update(() => r.state)
      setEvent(r.event)
      if (state.settings.showExplanation) setModal("result")
    },
    [cur, outcome, platform, update, isSuper, state],
  )

  useEffect(() => {
    if (remaining <= 0 && !outcome && cur) finish("timeout", null)
  }, [remaining, outcome, cur, finish])

  /** После «Дальше»: событие (серия / итог супервикторины) → следующий экран. */
  const advance = useCallback(() => {
    setModal(null)
    platform.mainButton.hide()
    if (event?.kind === "streak") {
      setModal("streak")
      return
    }
    if (event?.kind === "super-done") {
      setModal("super")
      return
    }
    if (event?.kind === "block-failed") {
      setModal("failed")
      return
    }
    if (event?.kind === "perfect") {
      setModal("perfect")
      return
    }
    if (state.lives <= 0) navigate("/lives-out", { replace: true })
    else if (state.block.phase === "super-intro") navigate("/quiz/super-intro", { replace: true })
    else if (state.block.phase === "results") navigate("/quiz/results", { replace: true })
    else void nextQuestion()
  }, [event, platform, state.lives, state.block.phase, navigate, nextQuestion])

  // Пояснения выключены — «Дальше» на нативной MainButton.
  useEffect(() => {
    if (outcome && !state.settings.showExplanation && !modal) platform.mainButton.show(t("quiz.next"), advance)
    return () => platform.mainButton.hide()
  }, [outcome, modal, state.settings.showExplanation, platform, t, advance])

  const afterStreak = () => {
    if (event?.kind === "streak" && event.thenPerfect) {
      setEvent({ kind: "perfect" })
      setModal("perfect")
      return
    }
    setEvent(null)
    setModal(null)
    if (state.lives <= 0) navigate("/lives-out", { replace: true })
    else if (state.block.phase === "results") navigate("/quiz/results", { replace: true })
    else void nextQuestion()
  }

  /** «3 ошибки» → «Продолжить»: блок начинается с нуля, игрок уходит на главную. */
  const failedContinue = () => {
    navigate("/", { replace: true })
    update(restartBlock)
  }

  /** «Поднять ставки» — сразу первый вопрос супервикторины; «Не сейчас» — итоги блока без неё. */
  const startSuper = () => startOver({ ...state, block: { ...state.block, phase: "super" } })
  const skipSuper = () => {
    update((s) => ({ ...s, block: { ...s.block, phase: "results" } }))
    navigate("/quiz/results", { replace: true })
  }

  const applyHint = (h: HintType) => {
    if (!cur || outcome) return
    platform.haptic.impact("light")
    if (h !== "skip" || isSuper) update((s) => spendHint(s, h))
    if (h === "skip") {
      if (isSuper) {
        // В супервикторине «Пропуск» заменяет вопрос другим сложным.
        void nextQuestion([cur.q.id])
      } else {
        const r = applyRegularOutcome(spendHint(state, h), cur.q, "skip", Date.now(), cur.review)
        update(() => r.state)
        lastOutcome.current = "skip"
        if (r.event?.kind === "perfect") {
          setEvent(r.event)
          setModal("perfect")
        } else if (r.state.block.phase === "results") navigate("/quiz/results", { replace: true })
        else void nextQuestion([cur.q.id], r.state)
      }
      return
    }
    const gone = hintRemovals(cur.q, h, cur.removed)
    setCur({ ...cur, removed: [...cur.removed, ...gone], used: [...cur.used, h] })
  }

  const closeTip = () => {
    if (tip) update((s) => ({ ...s, tips: { ...s.tips, [tip]: true } }))
    setTip(null)
  }

  // 2.9: выход из блока — нативный попап; вышел — блок заново, потраченные жизни и подсказки не возвращаются.
  useBackButton(() => {
    if (exiting) return
    setExiting(true)
    platform
      .showPopup({
        title: t("quiz.exit.title"),
        message: t("quiz.exit.message"),
        buttons: [
          { id: "exit", type: "destructive", text: t("quiz.exit.leave") },
          { id: "stay", type: "default", text: t("quiz.exit.stay") },
        ],
      })
      .then((id) => {
        setExiting(false)
        if (id !== "exit") return
        navigate("/", { replace: true })
        update(restartBlock)
      })
  })

  const tiles = useMemo(() => {
    if (!cur) return {}
    const st: Record<number, TileState> = {}
    for (const i of [0, 1, 2, 3]) {
      if (cur.removed.includes(i)) st[i] = "removed"
      else if (!outcome) st[i] = "idle"
      else if (i === cur.q.correct) st[i] = "correct"
      else if (i === chosen) st[i] = "wrong"
      else st[i] = "dim"
    }
    return st
  }, [cur, outcome, chosen])

  if (state.lives <= 0 && !outcome) return <Navigate to="/lives-out" replace />
  if (state.block.phase === "super-intro" && !outcome && !modal) return <Navigate to="/quiz/super-intro" replace />
  if (state.block.phase === "results" && !outcome && !modal) return <Navigate to="/quiz/results" replace />

  const results = isSuper ? state.block.superResults : state.block.results
  const total = isSuper ? SUPER_SIZE : GAME.blockSize
  // После ответа «текущей» точки нет — отвеченная уже окрашена исходом.
  const current = outcome ? -1 : results.length

  return (
    <ShellLayout tabBar={false} className="gap-4" spot={!isSuper && noImageRef.current ? "team" : "violet"}>
      <GameHeader
        lives={state.lives}
        lostLife={outcome === "wrong" || outcome === "timeout"}
        isSuper={isSuper}
        results={results}
        total={total}
        current={current}
        remainingMs={remaining}
        totalMs={TOTAL_MS}
        livesRef={livesRef}
        timerRef={timerRef}
      />

      {/* Без иллюстрации — отступ 98 при 375 (0,261 ширины, как и картинка): под ним просвечивает фон с командой. */}
      {!isSuper && noImageRef.current && <div aria-hidden className="h-[min(26.1vw,98px)] shrink-0" />}

      {cur?.q.image && (
        <figure className="card-gradient relative flex min-h-[160px] flex-1 items-center justify-center overflow-hidden rounded-xl">
          <img src={`${import.meta.env.BASE_URL}${cur.q.image}`} alt="" className="max-h-full max-w-full object-contain" />
          <button
            type="button"
            aria-label={t("quiz.expand")}
            onClick={() => setImageOpen(true)}
            className="absolute right-[7px] bottom-[7px] flex size-7 items-center justify-center rounded-sm bg-background"
          >
            <Icon name="expand" className="size-4" />
          </button>
        </figure>
      )}

      {/* Резерв на 4 строки (самый длинный вопрос на 375 px), текст прижат к низу — ответы не сдвигаются между вопросами. */}
      <h1 aria-live="polite" className="flex min-h-[120px] items-end pb-4 text-h2 font-bold">
        {cur?.q.question ?? ""}
      </h1>

      {cur && (
        <AnswerGrid
          options={cur.order.map((i) => ({ key: i, text: cur.q.options[i] }))}
          states={tiles}
          disabled={!!outcome || tip !== null}
          onPick={(i) => finish(i === cur.q.correct ? "correct" : "wrong", i)}
        />
      )}

      <div className="mt-auto flex min-h-16 flex-col justify-end">
        {!outcome && (
          <Boosters
            counts={state.hints}
            used={cur?.used ?? []}
            disabled={!cur || tip !== null}
            onUse={applyHint}
            firstRef={boosterRef}
          />
        )}
      </div>

      {tip && (
        <CoachTooltip
          target={tip === "timer" ? timerRef : tip === "lives" ? livesRef : boosterRef}
          text={t(`quiz.tip.${tip}`, { sec: GAME.questionSeconds, cap: GAME.livesRegenCap })}
          onClose={closeTip}
        />
      )}

      {cur && outcome && (
        <ResultModal
          open={modal === "result"}
          outcome={outcome}
          answer={cur.q.options[cur.q.correct]}
          explanation={cur.q.explanation}
          streak={state.streak}
          onNext={advance}
        />
      )}

      {event?.kind === "streak" && (
        <CenterModal open={modal === "streak"} onClose={afterStreak} labelledBy="streak-title" icon={flame3d}>
          <h2 id="streak-title" className="text-h1 font-bold">
            {tp("streak.title", event.streak)}
          </h2>
          <span className="flex items-center gap-1 rounded-full bg-accent py-1.5 pr-3 pl-2 text-button font-semibold">
            <img src={HINT_IMAGES[event.hint]} alt="" className="size-6 object-contain" />
            +1 {t(`hint.${event.hint}`)}
          </span>
          <p className="text-body text-muted-foreground">{t("streak.text", { name: t(`hint.${event.hint}`) })}</p>
          <Button variant="cta" size="cta" autoFocus onClick={afterStreak}>
            {t("streak.claim")}
          </Button>
        </CenterModal>
      )}

      {event?.kind === "super-done" && (
        <SuperResultModal
          open={modal === "super"}
          passed={event.passed}
          results={state.block.superResults}
          questions={(state.block.superIds ?? []).map((id) => findQuestion(id, lang)).filter((x): x is Question => !!x)}
          livesBefore={event.livesBefore}
          livesAfter={event.livesAfter}
          burned={event.burned}
          hint={event.hint}
          onShowExplanation={(q) => setExplain(q)}
          onDone={() => navigate("/quiz/results", { replace: true })}
        />
      )}

      {explain && (
        <ResultModal
          open
          outcome="wrong"
          answer={explain.options[explain.correct]}
          explanation={explain.explanation}
          streak={0}
          onNext={() => setExplain(null)}
        />
      )}

      {event?.kind === "perfect" && (
        <CenterModal open={modal === "perfect"} onClose={skipSuper} labelledBy="perfect-title" icon={star3d}>
          <h2 id="perfect-title" className="text-h1 font-bold">
            {t("perfect.title")}
          </h2>
          <p className="text-body text-muted-foreground">
            {t("perfect.text", { total: GAME.blockSize, lives: GAME.superRewardLives })}
          </p>
          <Button variant="cta" size="cta" autoFocus onClick={startSuper}>
            {t("perfect.go")}
          </Button>
          <Button variant="outline-cta" size="cta" onClick={skipSuper}>
            {t("perfect.skip")}
          </Button>
        </CenterModal>
      )}

      {event?.kind === "block-failed" && (
        <CenterModal open={modal === "failed"} onClose={failedContinue} labelledBy="failed-title" icon={wrong3d}>
          <h2 id="failed-title" className="text-h1 font-bold">
            {t("blockFailed.title", { count: event.mistakes })}
          </h2>
          <p className="text-body text-muted-foreground">{t("blockFailed.text")}</p>
          <Button variant="cta" size="cta" autoFocus onClick={failedContinue}>
            {t("blockFailed.continue")}
          </Button>
        </CenterModal>
      )}

      <LevelDoneModal
        open={levelDone}
        level={state.block.level}
        onPick={(l) => startOver({ ...state, level: l, pendingLevel: null, block: newBlock(state.block.number + 1, l, state.lives) })}
        onCancel={() => navigate("/", { replace: true })}
      />

      {imageOpen && cur?.q.image && (
        <dialog
          open
          className="fixed inset-0 z-50 flex size-full max-h-none max-w-none items-center justify-center bg-background/95 p-4"
          onClick={() => setImageOpen(false)}
        >
          <img src={`${import.meta.env.BASE_URL}${cur.q.image}`} alt="" className="max-h-full max-w-full object-contain" />
        </dialog>
      )}
    </ShellLayout>
  )
}
