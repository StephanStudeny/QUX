"""Проверка банка вопросов UX-викторины.

Печатает наблюдения, а не вердикт: что нарушает правила контента из
design/game-brief.md. Запуск: python tools/questions/validate_questions.py [файл.json ...]

Кроме правил по каждому вопросу ищет дубли по всему банку (все переданные файлы):
- одинаковый верный ответ у двух вопросов — почти всегда одно и то же понятие;
- похожий текст вопроса (доля общих основ слов ≥ SIMILAR_SHARE).
Пары, проверенные вручную и признанные разными, перечисляются в meta.reviewed_not_duplicates.
Квоты уровня (regular / super, ux / ui / product) берутся из meta.targets и
печатаются как статус наполнения, а не как замечания.
"""
import glob
import json
import re
import sys
from collections import Counter
from itertools import combinations

MAX_QUESTION = 90      # 3 строки по 20 px в блоке 342 px
MAX_OPTION_CHARS = 24  # плитка 2x2, до 2 строк
MAX_OPTION_WORDS = 2
LONGEST_CORRECT_SHARE = 0.30
SIMILAR_SHARE = 0.5
AREAS = {'ux', 'ui', 'product'}
TIERS = {'regular', 'super'}
STOP = {'это', 'какой', 'какая', 'какое', 'какие', 'зачем', 'почему', 'что', 'как', 'чтобы',
        'когда', 'если', 'или', 'для', 'при', 'без', 'над', 'под', 'его', 'она', 'они', 'вас',
        'называют', 'называется', 'такой', 'нужно', 'лучше', 'всего'}


def words(s):
    """Слова = токены с буквами или цифрами; символы вроде →, >, — не считаются."""
    return [t for t in s.split() if re.search(r'\w', t)]


def stems(s):
    """Грубые основы: первые 5 букв значимых слов — для поиска перефразированных вопросов."""
    toks = re.findall(r'[a-zа-яё0-9]+', s.lower())
    return {t[:5] for t in toks if len(t) > 3 and t not in STOP}


def norm(s):
    return re.sub(r'[^a-zа-яё0-9]', '', s.lower().replace('ё', 'е'))


def check(path):
    data = json.load(open(path, encoding='utf-8'))
    qs = data['questions']
    targets = data.get('meta', {}).get('targets')
    issues = []
    ids = Counter(q['id'] for q in qs)
    issues += [f"{i}: ID повторяется" for i, n in ids.items() if n > 1]
    longest = Counter()
    per_level = Counter()
    fill = Counter()
    for q in qs:
        i, opts = q['id'], q['options']
        per_level[q['level']] += 1
        if 'area' in q or 'tier' in q:
            if q.get('area') not in AREAS:
                issues.append(f"{i}: area «{q.get('area')}» не из {sorted(AREAS)}")
            if q.get('tier') not in TIERS:
                issues.append(f"{i}: tier «{q.get('tier')}» не из {sorted(TIERS)}")
            fill[(q['level'], q.get('tier'), q.get('area'))] += 1
        if len(opts) != 4:
            issues.append(f"{i}: вариантов {len(opts)}, нужно 4")
        if q['correct'] in q['funny']:
            issues.append(f"{i}: шуточный вариант помечен как верный")
        if not q['funny']:
            issues.append(f"{i}: нет шуточного варианта")
        if len(q['question']) > MAX_QUESTION:
            issues.append(f"{i}: вопрос {len(q['question'])} симв. > {MAX_QUESTION}")
        if len({o.strip().lower() for o in opts}) < len(opts):
            issues.append(f"{i}: варианты повторяются")
        for o in opts:
            if len(words(o)) > MAX_OPTION_WORDS:
                issues.append(f"{i}: «{o}» — {len(words(o))} слова > {MAX_OPTION_WORDS}")
            if len(o) > MAX_OPTION_CHARS:
                issues.append(f"{i}: «{o}» — {len(o)} симв. > {MAX_OPTION_CHARS}")
        lens = [len(o) for o in opts]
        if lens[q['correct']] == max(lens) and lens.count(max(lens)) == 1:
            longest[q['level']] += 1
    print(f"{path}: {len(qs)} вопросов", dict(per_level))
    for lvl, n in per_level.items():
        share = longest[lvl] / n
        if share > LONGEST_CORRECT_SHARE:
            issues.append(f"{lvl}: верный — самый длинный в {longest[lvl]}/{n} ({share:.0%}) > {LONGEST_CORRECT_SHARE:.0%}")
        else:
            print(f"  {lvl}: верный — самый длинный в {longest[lvl]}/{n} ({share:.0%})")
        if targets:
            reg = sum(v for (l, t, a), v in fill.items() if l == lvl and t == 'regular')
            sup = sum(v for (l, t, a), v in fill.items() if l == lvl and t == 'super')
            areas = ', '.join(f"{a} {fill[(lvl, 'regular', a)]}/{targets['area_regular'][lvl][a]}"
                              for a in ('ux', 'ui', 'product'))
            print(f"  наполнение: regular {reg}/{targets['regular']} ({areas}); super {sup}/{targets['super']}")
    for s in issues:
        print('  ' + s)
    print(f"  замечаний: {len(issues)}")
    reviewed = {frozenset(p) for p in data.get('meta', {}).get('reviewed_not_duplicates', [])}
    return len(issues), qs, reviewed


def duplicates(all_qs, reviewed):
    issues = []
    by_answer = {}
    for q in all_qs:
        by_answer.setdefault(norm(q['options'][q['correct']]), []).append(q['id'])
    for ans, qids in by_answer.items():
        if len(qids) == 2 and frozenset(qids) in reviewed:
            continue
        if len(qids) > 1:
            issues.append(f"одинаковый верный ответ: {', '.join(qids)}")
    st = [(q['id'], stems(q['question'])) for q in all_qs]
    for (a, sa), (b, sb) in combinations(st, 2):
        if frozenset((a, b)) in reviewed:
            continue
        if sa and sb and len(sa & sb) / min(len(sa), len(sb)) >= SIMILAR_SHARE and len(sa & sb) >= 3:
            issues.append(f"похожие вопросы: {a} ~ {b} ({', '.join(sorted(sa & sb))})")
    print(f"дубли по банку ({len(all_qs)} вопросов):")
    for s in issues:
        print('  ' + s)
    print(f"  замечаний: {len(issues)}")
    return len(issues)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    files = sys.argv[1:] or sorted(glob.glob('design/questions/*.json'))
    total, bank, reviewed = 0, [], set()
    for f in files:
        n, qs, rv = check(f)
        total += n
        bank += qs
        reviewed |= rv
    total += duplicates(bank, reviewed)
    sys.exit(1 if total else 0)
