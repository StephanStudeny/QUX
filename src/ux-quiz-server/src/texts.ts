/** Тексты бота и счетов. Язык — из Telegram (language_code): ru → русский, остальное → английский. */

/** 1 жизнь, 3 жизни, 5 жизней. */
const ruPlural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

const RU = {
  startGreeting: "Привет! Это QUX — викторина для дизайнеров: проверьте, насколько вы в теме продуктового дизайна. Подсказки помогут, а друзья составят конкуренцию.",
  startButton: "Играть",
  lifeRestored: "Жизнь восстановилась — можно продолжать викторину.",
  lifeButton: "Продолжить",
  invoiceTitle: (lives: number, hints?: number) => {
    const l = `+${lives} ${ruPlural(lives, "жизнь", "жизни", "жизней")}`
    return hints ? `${l} и по ${hints} ${ruPlural(hints, "подсказке", "подсказки", "подсказок")}` : l
  },
  invoiceDescription: "Жизни и подсказки для QUX.",
  checkoutStale: "Счёт устарел. Откройте Буст и попробуйте снова.",
  supportPrompt: "Опишите проблему с оплатой одним сообщением — передам автору. Номер платежа подставлю сам.",
  supportSent: "Передал автору. Ответ придёт сюда, в этот чат.",
  supportReply: "Ответ автора:",
  supportOff: "Поддержка пока не подключена — попробуйте позже.",
  refunded: (stars: number) => `Вернули ${stars} ⭐ за покупку. Звёзды уже на балансе.`,
  terms: "Условия использования",
  privacy: "Политика конфиденциальности",
  docSoon: "Документ скоро появится.",
}

const EN: typeof RU = {
  startGreeting: "Hi! This is QUX, a quiz for designers: see how well you know product design. Hints will help, and friends will keep you on your toes.",
  startButton: "Play",
  lifeRestored: "A life is back — you can keep playing.",
  lifeButton: "Continue",
  invoiceTitle: (lives, hints) => {
    const l = `+${lives} ${lives === 1 ? "life" : "lives"}`
    return hints ? `${l} and ${hints} of each hint` : l
  },
  invoiceDescription: "Lives and hints for QUX.",
  checkoutStale: "This invoice has expired. Open Boost and try again.",
  supportPrompt: "Describe the payment issue in one message — I’ll pass it to the author along with your payment IDs.",
  supportSent: "Sent to the author. The reply will come here, in this chat.",
  supportReply: "Reply from the author:",
  supportOff: "Support isn’t connected yet — please try later.",
  refunded: (stars) => `We’ve refunded ${stars} ⭐ for your purchase. The Stars are back on your balance.`,
  terms: "Terms of Use",
  privacy: "Privacy Policy",
  docSoon: "The document will be available soon.",
}

export const texts = (language: string | null | undefined) => (language?.startsWith("ru") ? RU : EN)

/**
 * Профиль бота (npm run bot:setup): описание в пустом чате (≤ 512), «О боте» (≤ 120), меню команд.
 * Русский — для language_code ru, английский — для всех остальных.
 */
export const BOT_PROFILE = {
  ru: {
    description:
      "QUX — викторина для продуктовых и UX/UI-дизайнеров. Короткие вопросы из рабочего словаря: от гештальта до метрик. Подсказки выручат, жизни восстанавливаются, а за блок без ошибок — супервикторина. Нажмите «Играть» — узнаем, насколько вы в теме.",
    shortDescription: "Викторина для продуктовых и UX/UI-дизайнеров: проверьте, насколько вы в теме.",
    commands: [
      { command: "start", description: "Открыть игру" },
      { command: "paysupport", description: "Помощь с оплатой" },
      { command: "terms", description: "Условия использования" },
      { command: "privacy", description: "Политика конфиденциальности" },
    ],
    menuButton: "Играть",
  },
  en: {
    description:
      "QUX is a quiz for product and UX/UI designers. Short questions from everyday design vocabulary, from Gestalt to metrics. Hints help out, lives regenerate, and a flawless block unlocks the super quiz. Tap “Play” and let’s see how well you know your stuff.",
    shortDescription: "A quiz for product and UX/UI designers: see how well you know your stuff.",
    commands: [
      { command: "start", description: "Open the game" },
      { command: "paysupport", description: "Payment support" },
      { command: "terms", description: "Terms of Use" },
      { command: "privacy", description: "Privacy Policy" },
    ],
    menuButton: "Play",
  },
}
