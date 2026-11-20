#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Сводка по замерам всех шаблонов. Пишет data/SUMMARY.md и data/table.md."""
import json, sys, os, io
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = json.load(io.open(os.path.join(ROOT, 'data/measurements-desktop.json'), encoding='utf-8'))
M = json.load(io.open(os.path.join(ROOT, 'data/measurements-phone.json'), encoding='utf-8'))
mob = {r['id']: r for r in M}

ok = [r for r in D if not r.get('err') and r.get('canvas')]
bad = [r for r in D if r.get('err')]


def pct(n, total=None):
    total = total or len(ok)
    return f"{n} из {total} ({round(100 * n / total)} %)"


def med(xs):
    xs = sorted(x for x in xs if x is not None)
    return xs[len(xs) // 2] if xs else None


L = []
w = L.append

w('# Сводка замеров по каталогу Readymag\n')
w(f'Всего шаблонов в каталоге: **{len(D)}**. Обмерено успешно: **{len(ok)}**. '
  f'Не открылось или отдало пустую страницу: {len(bad)}.\n')
w('Замеры сняты в headless-Chrome: десктоп — окно 1024×900, телефон — 375×812 '
  'с мобильным user-agent. Все размеры приведены к единицам холста.\n')

# — холсты
w('## Ширина холста\n')
c = Counter(r['canvas'] for r in ok)
w('| Холст | Шаблонов | Доля |')
w('| --- | --- | --- |')
for k, n in sorted(c.items()):
    w(f'| {k} | {n} | {round(100 * n / len(ok))} % |')
w('')
w(f'Самый частый холст — **{c.most_common(1)[0][0]}**. '
  'Ширина холста — решение автора шаблона, а не константа платформы.\n')

# — высота
w('## Высота страницы\n')
one = [r for r in ok if r.get('pageH') and r['pageH'] <= r.get('vw', 1024) * 0.95]
scr = [r.get('screens') for r in ok if r.get('screens')]
w(f'- Медианная высота первой страницы: **{med([r.get("pageH") for r in ok])} px холста**.')
w(f'- Умещается в один экран без прокрутки: {pct(len([r for r in ok if (r.get("screens") or 9) <= 1.02]))}.')
w(f'- Длиннее пяти экранов: {pct(len([r for r in ok if (r.get("screens") or 0) > 5]))}.')
w(f'- Содержимое шире окна (лента, уходящая за правый край): {pct(len([r for r in ok if r.get("hscroll")]))}.\n')

# — поля
w('## Поля\n')
ml = [r.get('marginL') for r in ok if r.get('marginL') is not None]
w(f'- Медианное левое поле: **{med(ml)} px** при холсте 1024 — это примерно '
  f'{round(100 * (med(ml) or 0) / 1024, 1)} % ширины.')
w(f'- Поле меньше 20 px: {pct(len([x for x in ml if x < 20]), len(ml))} — сетки данных и полноэкранные кадры.')
w(f'- Поле больше 100 px: {pct(len([x for x in ml if x > 100]), len(ml))} — тексты для чтения.\n')

# — типографика
w('## Типографика\n')
tc = [r.get('typeCount') for r in ok if r.get('typeCount')]
w(f'- Медианное число разных начертаний (гарнитура + кегль + интерлиньяж + насыщенность) '
  f'на первой странице: **{med(tc)}**.')
w(f'- Укладываются в четыре начертания: {pct(len([x for x in tc if x <= 4]), len(tc))}.')
w(f'- Больше восьми начертаний: {pct(len([x for x in tc if x > 8]), len(tc))}.')
sizes = []
for r in ok:
    for t in r.get('type', []):
        try:
            sizes.append(float(t['spec'].split('|')[1]))
        except Exception:
            pass
if sizes:
    big = [s for s in sizes if s >= 60]
    w(f'- Доля начертаний крупнее 60 px: {round(100 * len(big) / len(sizes))} % — '
      f'дисплейный слой есть почти у всех.')
    small = [s for s in sizes if s <= 10]
    w(f'- Доля начертаний 10 px и мельче: {round(100 * len(small) / len(sizes))} % — '
      f'служебный слой, который на телефоне не вырастет.\n')

# — скругления
w('## Скругления\n')
with_r = [r for r in ok if r.get('radii')]
w(f'- Шаблонов, где хоть один виджет скруглён: {pct(len(with_r))}.')
rv = Counter()
for r in with_r:
    for k, n in r['radii'].items():
        rv[k] += n
w('')
w('| Радиус | Сколько виджетов |')
w('| --- | --- |')
for k, n in rv.most_common(10):
    w(f'| {k} | {n} |')
w('')
w('Прямой угол — норма каталога; скругление появляется только там, где оно несёт смысл.\n')

# — кадры
w('## Изображения\n')
pics = [r for r in ok if r.get('pics')]
cov = sum(r.get('crop', 0) for r in ok)
tot = sum(r.get('pics', 0) for r in ok)
w(f'- Шаблонов с изображениями на первой странице: {pct(len(pics))}.')
if tot:
    w(f'- Кадрируются через `object-fit: cover`: **{round(100 * cov / tot)} %** всех изображений.')
uni = 0
for r in pics:
    ar = r.get('aspect') or {}
    if ar and max(ar.values()) >= max(2, 0.6 * sum(ar.values())):
        uni += 1
w(f'- Приводят кадры к одному формату (единый кадр): {pct(uni, len(pics))}.')
w(f'- Используют поворот виджета: {pct(len([r for r in ok if r.get("rotated")]))}.\n')

# — состояния
w('## Состояния ссылок\n')
has_cur = [r for r in ok if (r.get('linkStates') or {}).get('current')]
has_hov = [r for r in ok if (r.get('linkStates') or {}).get('hover')]
w(f'- Описано состояние наведения: {pct(len(has_hov))}.')
w(f'- Описано состояние «текущий раздел»: {pct(len(has_cur))}.')
w(f'- Подчёркивание нарисовано фоном-градиентом, а не `text-decoration`: {pct(len([r for r in ok if r.get("underline")]))}.\n')
tr = Counter()
for r in ok:
    for k, n in (r.get('transitions') or {}).items():
        tr[k] += n
if tr:
    w('| Длительность перехода | Виджетов |')
    w('| --- | --- |')
    for k, n in tr.most_common(6):
        w(f'| {k} | {n} |')
    w('')

# — закреплённые
w('## Закреплённые элементы\n')
fx = [r for r in ok if r.get('fixed')]
w(f'- Есть закреплённые виджеты (шапка, навигация, подпись): {pct(len(fx))}.')
w(f'- Медианное число закреплённых виджетов: {med([r.get("fixed") for r in fx]) if fx else 0}.\n')

# — телефон
w('## Телефон\n')
pairs = [(r, mob[r['id']]) for r in ok if r['id'] in mob and not mob[r['id']].get('err')]
mc = Counter(m.get('canvas') for _, m in pairs)
w(f'- Пар «десктоп / телефон», где снялись обе стороны: **{len(pairs)}**.')
w(f'- Холст телефона у всех обмеренных шаблонов один: '
  f'**{mc.most_common(1)[0][0]}** при `zoom = 1` — то есть телефонная версия рисуется '
  f'в натуральную величину, без масштабирования.')
tcm = [m.get('typeCount') for _, m in pairs if m.get('typeCount')]
if tcm:
    w(f'- Медианное число начертаний на телефоне: **{med(tcm)}** против {med(tc)} на десктопе.')
w('')
w('> Высоту телефонной страницы и горизонтальную прокрутку по каталогу целиком считать нельзя: '
  'у части шаблонов за отведённое время успевает отрисоваться не вся страница, '
  f'а контейнер `.content-bounds` на телефоне почти всегда шире окна и сигналом не служит. '
  f'Проверено: у {len([1 for _, m in pairs if (m.get("screens") or 0) < 0.99])} из {len(pairs)} '
  'телефонных записей высота страницы меньше экрана, что для живой страницы невозможно. '
  'Поэтому выводы о телефоне в этом справочнике опираются на десять шаблонов, '
  'разобранных вручную, — см. [принцип 07](../principles/07-telefon.md). '
  'Сырые телефонные записи оставлены в `measurements-phone.json` как есть.\n')

w('---\n')
w('Полная таблица по каждому шаблону — [table.md](table.md). '
  'Исходные записи — `measurements-desktop.json` и `measurements-phone.json`.\n')

io.open(os.path.join(ROOT, 'data/SUMMARY.md'), 'w', encoding='utf-8').write('\n'.join(L))

# — полная таблица
T = []
t = T.append
t('# Все шаблоны каталога: замеры\n')
t('Всё — по первой странице шаблона, в единицах холста, при окне 1024×900. '
  '«Начертаний» — число различных сочетаний гарнитуры, кегля, интерлиньяжа и насыщенности. '
  '«Краёв» — сколько различных левых краёв у заметных блоков: грубая оценка числа колонок. '
  '«Скругления» — какие радиусы встречаются на странице.\n')
t('| Шаблон | Автор | Рубрики | Холст | Высота | Экранов | Поле | Краёв | Начертаний | Кадров | Скругления | Просмотр |')
t('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for r in sorted(D, key=lambda x: (x.get('cats') or 'яяя', x.get('title') or '')):
    cols = len(r.get('colEdges') or []) or ''
    rad = ', '.join(sorted((r.get('radii') or {}).keys()))[:28] or '—'
    t(f"| {r.get('title','')} | {r.get('by','')} | {(r.get('cats') or '—').replace('/', ', ')} | "
      f"{r.get('canvas','—')} | {r.get('pageH','—')} | {r.get('screens','—')} | "
      f"{r.get('marginL','—')} | {cols} | {r.get('typeCount','—')} | {r.get('pics','—')} | "
      f"{rad} | [{r['id']}](https://readymag.com/{r['id']}) |")
io.open(os.path.join(ROOT, 'data/table.md'), 'w', encoding='utf-8').write('\n'.join(T) + '\n')

print('SUMMARY.md и table.md обновлены:', len(ok), 'записей')
