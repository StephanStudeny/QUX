// Проверка английского банка против русского: те же id, 4 варианта, лимиты: вопрос ≤90, ответ ≤24 символов
// и ≤3 слов (в EN артикли и предлоги — отдельные слова; смысл лимита — ответ влезает в плитку в 2 строки).
const fs = require("fs")
for (const l of process.argv.slice(2)) {
  const ru = JSON.parse(fs.readFileSync(`${l}.json`, "utf8")).questions
  const en = JSON.parse(fs.readFileSync(`${l}.en.json`, "utf8")).questions
  const ids = new Set(en.map((q) => q.id)), problems = []
  for (const q of ru) if (!ids.has(q.id)) problems.push(`нет перевода ${q.id}`)
  for (const q of en) {
    const r = ru.find((x) => x.id === q.id)
    if (!r) { problems.push(`лишний ${q.id}`); continue }
    if (q.options.length !== 4) problems.push(`${q.id}: вариантов ${q.options.length}`)
    if (q.question.length > 90) problems.push(`${q.id}: вопрос ${q.question.length} симв.`)
    q.options.forEach((o, i) => {
      const words = o.split(/\s+/).length
      if (words > 3 || o.length > 24) problems.push(`${q.id}: вариант «${o}» (${words} сл., ${o.length} симв.)${i === r.correct ? " [верный]" : ""}`)
    })
    if (new Set(q.options.map((o) => o.toLowerCase())).size < 4) problems.push(`${q.id}: дубли вариантов`)
  }
  console.log(`${l}: ${en.length}/${ru.length}`, problems.length ? "\n  " + problems.join("\n  ") : "— ок")
}
