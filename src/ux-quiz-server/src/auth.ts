import { createHmac, timingSafeEqual } from "node:crypto"

/** Пользователь Telegram из initData (поля, которые нужны серверу). */
export interface TgUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  language_code?: string
}

export interface InitData {
  user: TgUser
  startParam: string | null
  authDate: number
}

/**
 * Проверка initData Mini App по документации Telegram:
 * secret = HMAC_SHA256(key "WebAppData", botToken), hash = HMAC_SHA256(secret, data_check_string).
 * data_check_string — все поля, кроме hash, `key=value` по алфавиту через \n.
 * `maxAgeSec` — защита от повторного использования старой подписи.
 */
export function validateInitData(raw: string, botToken: string, nowSec: number, maxAgeSec = 24 * 60 * 60): InitData | null {
  const params = new URLSearchParams(raw)
  const hash = params.get("hash")
  if (!hash) return null
  params.delete("hash")
  const dataCheck = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n")
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest()
  const expected = createHmac("sha256", secret).update(dataCheck).digest()
  const given = Buffer.from(hash, "hex")
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null

  const authDate = Number(params.get("auth_date"))
  if (!Number.isFinite(authDate) || nowSec - authDate > maxAgeSec) return null
  const userRaw = params.get("user")
  if (!userRaw) return null
  try {
    const user = JSON.parse(userRaw) as TgUser
    if (!Number.isInteger(user.id)) return null
    return { user, startParam: params.get("start_param"), authDate }
  } catch {
    return null
  }
}

/** Подпись initData — для тестов и dev-инструментов (та же формула, что у Telegram). */
export function signInitData(fields: Record<string, string>, botToken: string): string {
  const dataCheck = Object.keys(fields)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join("\n")
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest()
  const hash = createHmac("sha256", secret).update(dataCheck).digest("hex")
  return new URLSearchParams({ ...fields, hash }).toString()
}

/** Реферальный код из start_param: `ref_<telegram id>`. */
export function parseRef(startParam: string | null | undefined): number | null {
  const m = /^ref_(\d{1,20})$/.exec(startParam ?? "")
  if (!m) return null
  const id = Number(m[1])
  return Number.isSafeInteger(id) && id > 0 ? id : null
}
