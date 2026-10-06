import { DatabaseSync } from "node:sqlite"

/**
 * Хранилище. Сервер работает только через этот интерфейс — переезд с SQLite
 * на Postgres/Turso при выборе хостинга = новая реализация этого файла, без правок в маршрутах.
 * Методы асинхронные, хотя SQLite синхронный: облачные базы будут асинхронными.
 */
export interface User {
  id: number
  name: string
  photoUrl: string | null
  language: string | null
  createdAt: number
  inviterId: number | null
  /** Сколько вопросов первого блока пройдено (0–10), только растёт. */
  firstBlock: number
  /** Пригласивший забрал награду за этого друга. */
  inviteRewardClaimed: boolean
  /** Прогресс для профиля друзей и статистики автора — присылает клиент. */
  level: string | null
  /** Сколько блоков пройдено целиком. */
  blocks: number
  answered: number
  /** id аватара из набора игры; null — фото из Telegram. */
  avatar: string | null
  /** Никнейм из профиля игры; null — имя из Telegram. */
  nickname: string | null
  lastSeenAt: number | null
}

export interface PlayerProgress {
  firstBlock: number
  level?: string | null
  blocks?: number
  answered?: number
  avatar?: string | null
  nickname?: string | null
}

/** Сводка для автора (/stats). */
export interface AdminStats {
  users: number
  newDay: number
  newWeek: number
  activeDay: number
  activeWeek: number
  byLevel: Record<string, number>
  starsTotal: number
  starsWeek: number
  paidCount: number
  refundedStars: number
  invited: number
}

export type PurchaseStatus = "pending" | "paid" | "claimed" | "refunded"

export interface Purchase {
  id: string
  userId: number
  packId: string
  stars: number
  status: PurchaseStatus
  createdAt: number
  paidAt: number | null
  /** telegram_payment_charge_id — нужен для возврата звёзд (refundStarPayment). */
  chargeId: string | null
}

export interface Notification {
  userId: number
  dueAt: number
  language: string | null
}

export interface Store {
  getUser(id: number): Promise<User | null>
  /** Создаёт пользователя или обновляет имя/фото/язык. `created` — запись новая (для реферала). */
  upsertUser(u: { id: number; name: string; photoUrl: string | null; language: string | null; now: number }): Promise<{ user: User; created: boolean }>
  setInviter(userId: number, inviterId: number): Promise<void>
  /** Прогресс игрока: firstBlock только растёт, остальное — последнее присланное. */
  setProgress(userId: number, p: PlayerProgress, now: number): Promise<void>
  listFriends(inviterId: number): Promise<User[]>
  /** Помечает награду за друга забранной; false — уже была забрана или это не его друг. */
  claimInviteReward(inviterId: number, friendId: number): Promise<boolean>

  createPurchase(p: Omit<Purchase, "status" | "paidAt" | "chargeId">): Promise<void>
  getPurchase(id: string): Promise<Purchase | null>
  /** pending → paid. false — покупка не в статусе pending. */
  markPaid(id: string, chargeId: string, now: number): Promise<boolean>
  /** paid → claimed. false — не оплачена или уже забрана. */
  markClaimed(id: string, userId: number): Promise<boolean>
  /** Оплаченные, но не забранные покупки — клиент добирает их при запуске. */
  listUnclaimed(userId: number): Promise<Purchase[]>

  /** Последние покупки игрока — для обращения в поддержку. */
  listPurchases(userId: number, limit: number): Promise<Purchase[]>
  getPurchaseByCharge(chargeId: string): Promise<Purchase | null>
  markRefunded(id: string): Promise<void>
  /** Оплаченные покупки (paid/claimed/refunded), новые сверху — для /sales. */
  listSales(limit: number): Promise<(Purchase & { userName: string })[]>
  /** Игроки по числу пройденных блоков — для /top. */
  topPlayers(limit: number): Promise<(User & { friends: number })[]>
  adminStats(now: number): Promise<AdminStats>

  /** Удаляет счета, которые так и не оплатили (старше `before`). Возвращает, сколько удалено. */
  deleteStalePending(before: number): Promise<number>

  /** Игрок нажал /paysupport — следующее его сообщение уходит автору. */
  setSupportPending(userId: number, pending: boolean): Promise<void>
  isSupportPending(userId: number): Promise<boolean>

  scheduleNotification(n: Notification): Promise<void>
  cancelNotification(userId: number): Promise<void>
  /** Забирает (и удаляет) уведомления, срок которых наступил. */
  takeDueNotifications(now: number): Promise<Notification[]>
}

type Row = Record<string, string | number | null>

const toUser = (r: Row): User => ({
  id: Number(r.id),
  name: String(r.name),
  photoUrl: (r.photo_url as string | null) ?? null,
  language: (r.language as string | null) ?? null,
  createdAt: Number(r.created_at),
  inviterId: r.inviter_id == null ? null : Number(r.inviter_id),
  firstBlock: Number(r.first_block),
  inviteRewardClaimed: Number(r.invite_reward_claimed) === 1,
  level: (r.level as string | null) ?? null,
  blocks: Number(r.blocks ?? 0),
  answered: Number(r.answered ?? 0),
  avatar: (r.avatar as string | null) ?? null,
  nickname: (r.nickname as string | null) ?? null,
  lastSeenAt: r.last_seen_at == null ? null : Number(r.last_seen_at),
})

const toPurchase = (r: Row): Purchase => ({
  id: String(r.id),
  userId: Number(r.user_id),
  packId: String(r.pack_id),
  stars: Number(r.stars),
  status: r.status as PurchaseStatus,
  createdAt: Number(r.created_at),
  paidAt: r.paid_at == null ? null : Number(r.paid_at),
  chargeId: (r.charge_id as string | null) ?? null,
})

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  photo_url TEXT,
  language TEXT,
  created_at INTEGER NOT NULL,
  inviter_id INTEGER,
  first_block INTEGER NOT NULL DEFAULT 0,
  invite_reward_claimed INTEGER NOT NULL DEFAULT 0,
  support_pending INTEGER NOT NULL DEFAULT 0,
  level TEXT,
  blocks INTEGER NOT NULL DEFAULT 0,
  answered INTEGER NOT NULL DEFAULT 0,
  avatar TEXT,
  nickname TEXT,
  last_seen_at INTEGER
);
CREATE INDEX IF NOT EXISTS users_inviter ON users(inviter_id);
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  pack_id TEXT NOT NULL,
  stars INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  paid_at INTEGER,
  charge_id TEXT
);
CREATE INDEX IF NOT EXISTS purchases_user ON purchases(user_id, status);
CREATE TABLE IF NOT EXISTS notifications (
  user_id INTEGER PRIMARY KEY,
  due_at INTEGER NOT NULL,
  language TEXT
);
`

/** SQLite из Node 24 (`node:sqlite`): без нативных зависимостей. `:memory:` — для тестов. */
export function createSqliteStore(path: string): Store {
  const db = new DatabaseSync(path)
  db.exec("PRAGMA journal_mode = WAL;")
  db.exec(SCHEMA)
  // Миграции для баз, созданных ранними версиями схемы.
  const userColumns = (db.prepare("PRAGMA table_info(users)").all() as Row[]).map((c) => c.name)
  const addColumn = (name: string, def: string) => {
    if (!userColumns.includes(name)) db.exec(`ALTER TABLE users ADD COLUMN ${name} ${def}`)
  }
  addColumn("support_pending", "INTEGER NOT NULL DEFAULT 0")
  addColumn("level", "TEXT")
  addColumn("blocks", "INTEGER NOT NULL DEFAULT 0")
  addColumn("answered", "INTEGER NOT NULL DEFAULT 0")
  addColumn("avatar", "TEXT")
  addColumn("nickname", "TEXT")
  addColumn("last_seen_at", "INTEGER")

  const one = (sql: string, ...args: (string | number | null)[]) => db.prepare(sql).get(...args) as Row | undefined
  const all = (sql: string, ...args: (string | number | null)[]) => db.prepare(sql).all(...args) as Row[]
  const run = (sql: string, ...args: (string | number | null)[]) => Number(db.prepare(sql).run(...args).changes)

  return {
    async getUser(id) {
      const r = one("SELECT * FROM users WHERE id = ?", id)
      return r ? toUser(r) : null
    },
    async upsertUser({ id, name, photoUrl, language, now }) {
      const created =
        run("INSERT OR IGNORE INTO users (id, name, photo_url, language, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)", id, name, photoUrl, language, now, now) > 0
      if (!created) run("UPDATE users SET name = ?, photo_url = COALESCE(?, photo_url), language = ?, last_seen_at = ? WHERE id = ?", name, photoUrl, language, now, id)
      return { user: toUser(one("SELECT * FROM users WHERE id = ?", id)!), created }
    },
    async setInviter(userId, inviterId) {
      run("UPDATE users SET inviter_id = ? WHERE id = ? AND inviter_id IS NULL", inviterId, userId)
    },
    async setProgress(userId, p, now) {
      run("UPDATE users SET first_block = MAX(first_block, ?), last_seen_at = ? WHERE id = ?", p.firstBlock, now, userId)
      if (p.blocks === undefined) return
      run(
        "UPDATE users SET level = ?, blocks = ?, answered = ?, avatar = ?, nickname = ? WHERE id = ?",
        p.level ?? null,
        p.blocks,
        p.answered ?? 0,
        p.avatar ?? null,
        p.nickname ?? null,
        userId,
      )
    },
    async listFriends(inviterId) {
      return all("SELECT * FROM users WHERE inviter_id = ? ORDER BY created_at", inviterId).map(toUser)
    },
    async claimInviteReward(inviterId, friendId) {
      return run("UPDATE users SET invite_reward_claimed = 1 WHERE id = ? AND inviter_id = ? AND invite_reward_claimed = 0", friendId, inviterId) > 0
    },

    async createPurchase(p) {
      run("INSERT INTO purchases (id, user_id, pack_id, stars, created_at) VALUES (?, ?, ?, ?, ?)", p.id, p.userId, p.packId, p.stars, p.createdAt)
    },
    async getPurchase(id) {
      const r = one("SELECT * FROM purchases WHERE id = ?", id)
      return r ? toPurchase(r) : null
    },
    async markPaid(id, chargeId, now) {
      return run("UPDATE purchases SET status = 'paid', charge_id = ?, paid_at = ? WHERE id = ? AND status = 'pending'", chargeId, now, id) > 0
    },
    async markClaimed(id, userId) {
      return run("UPDATE purchases SET status = 'claimed' WHERE id = ? AND user_id = ? AND status = 'paid'", id, userId) > 0
    },
    async listUnclaimed(userId) {
      return all("SELECT * FROM purchases WHERE user_id = ? AND status = 'paid' ORDER BY paid_at", userId).map(toPurchase)
    },

    async listPurchases(userId, limit) {
      return all("SELECT * FROM purchases WHERE user_id = ? ORDER BY created_at DESC LIMIT ?", userId, limit).map(toPurchase)
    },
    async getPurchaseByCharge(chargeId) {
      const r = one("SELECT * FROM purchases WHERE charge_id = ?", chargeId)
      return r ? toPurchase(r) : null
    },
    async markRefunded(id) {
      run("UPDATE purchases SET status = 'refunded' WHERE id = ?", id)
    },

    async listSales(limit) {
      return all(
        "SELECT p.*, u.name AS user_name FROM purchases p LEFT JOIN users u ON u.id = p.user_id WHERE p.status != 'pending' ORDER BY p.paid_at DESC LIMIT ?",
        limit,
      ).map((r) => ({ ...toPurchase(r), userName: String(r.user_name ?? r.user_id) }))
    },
    async topPlayers(limit) {
      return all(
        "SELECT u.*, (SELECT COUNT(*) FROM users f WHERE f.inviter_id = u.id) AS friends FROM users u ORDER BY u.blocks DESC, u.answered DESC LIMIT ?",
        limit,
      ).map((r) => ({ ...toUser(r), friends: Number(r.friends) }))
    },
    async adminStats(now) {
      const DAY = 24 * 60 * 60 * 1000
      const n = (sql: string, ...args: number[]) => Number(Object.values(one(sql, ...args) ?? {})[0] ?? 0)
      const byLevel: Record<string, number> = {}
      for (const r of all("SELECT COALESCE(level, '—') AS level, COUNT(*) AS c FROM users GROUP BY 1")) byLevel[String(r.level)] = Number(r.c)
      return {
        users: n("SELECT COUNT(*) FROM users"),
        newDay: n("SELECT COUNT(*) FROM users WHERE created_at >= ?", now - DAY),
        newWeek: n("SELECT COUNT(*) FROM users WHERE created_at >= ?", now - 7 * DAY),
        activeDay: n("SELECT COUNT(*) FROM users WHERE last_seen_at >= ?", now - DAY),
        activeWeek: n("SELECT COUNT(*) FROM users WHERE last_seen_at >= ?", now - 7 * DAY),
        byLevel,
        starsTotal: n("SELECT COALESCE(SUM(stars), 0) FROM purchases WHERE status IN ('paid', 'claimed')"),
        starsWeek: n("SELECT COALESCE(SUM(stars), 0) FROM purchases WHERE status IN ('paid', 'claimed') AND paid_at >= ?", now - 7 * DAY),
        paidCount: n("SELECT COUNT(*) FROM purchases WHERE status IN ('paid', 'claimed')"),
        refundedStars: n("SELECT COALESCE(SUM(stars), 0) FROM purchases WHERE status = 'refunded'"),
        invited: n("SELECT COUNT(*) FROM users WHERE inviter_id IS NOT NULL"),
      }
    },

    async deleteStalePending(before) {
      return run("DELETE FROM purchases WHERE status = 'pending' AND created_at < ?", before)
    },

    async setSupportPending(userId, pending) {
      run("UPDATE users SET support_pending = ? WHERE id = ?", pending ? 1 : 0, userId)
    },
    async isSupportPending(userId) {
      return Number(one("SELECT support_pending FROM users WHERE id = ?", userId)?.support_pending) === 1
    },

    async scheduleNotification({ userId, dueAt, language }) {
      run(
        "INSERT INTO notifications (user_id, due_at, language) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET due_at = excluded.due_at, language = excluded.language",
        userId,
        dueAt,
        language,
      )
    },
    async cancelNotification(userId) {
      run("DELETE FROM notifications WHERE user_id = ?", userId)
    },
    async takeDueNotifications(now) {
      const rows = all("SELECT * FROM notifications WHERE due_at <= ?", now)
      run("DELETE FROM notifications WHERE due_at <= ?", now)
      return rows.map((r) => ({ userId: Number(r.user_id), dueAt: Number(r.due_at), language: (r.language as string | null) ?? null }))
    },
  }
}
