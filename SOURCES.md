# Источники

## Этот справочник

Замеры сняты 19 ноября 2026 года с живых страниц. Метод: каждый шаблон открыт по адресу
`https://readymag.com/<id>` (тот же адрес, что за кнопкой Preview в каталоге); размеры
получены из `getComputedStyle` и `getBoundingClientRect` в живом DOM; прокрутка и наведение
выполнялись настоящими событиями мыши; состояния ссылок выписаны из правил CSS документа.

- Каталог: <https://readymag.com/templates>
- Программный список: `https://readymag.com/api/templatesets`, один шаблон —
  `/api/templatesets/<id>`. Через `curl` закрыт, читается из браузера или
  `chrome --headless --dump-dom`.
- Обмер всех 126 шаблонов: [tools/sweep.mjs](tools/sweep.mjs), результат —
  [data/measurements-desktop.json](data/measurements-desktop.json) и
  [data/measurements-phone.json](data/measurements-phone.json).

Разобраны подробно, с прокруткой и взаимодействием:

| Шаблон | Автор | Рубрики | Адрес |
| --- | --- | --- | --- |
| Editorial Stack | sainthelenastudio | microsites / photo_stories / longreads | <https://readymag.com/6414547> |
| Calendar | Readymag ambassadors | presentations | <https://readymag.com/6124192> |
| Grid · A—BUREAU | Readymag | company_website / microsites | <https://readymag.com/4493616> |
| Planet Earth | Readymag | longreads (брендбук) | <https://readymag.com/5738206> |
| Unveil | Readymag | microsites / photo_stories | <https://readymag.com/6248752> |
| Nordic | Readymag | company_website / photo_stories | <https://readymag.com/5991161> |
| Read Me: Magazine | Readymag | longreads | <https://readymag.com/1961938> |
| Portico | Readymag | presentations | <https://readymag.com/4198967> |
| Newold | Readymag | presentations | <https://readymag.com/5017761> |
| Portfolio Workbench | Readymag | microsites | <https://readymag.com/5647058> |

Права на шаблоны принадлежат их авторам. Снимки экрана приведены как материал разбора.

## Параллельное исследование

В проекте есть второй сбор материала по тому же каталогу, сделанный Codex:
`бренд прихода КПЛ/readymag-atlas`. Он устроен иначе и дополняет этот справочник.

| Что там | Чем полезно здесь |
| --- | --- |
| Визуальный атлас на 126 карточек: снимки `wide-top`, `wide-next`, `wide-end`, `phone-*`, `thumb` и `measurements.json` с координатами текстовых блоков | Готовые кадры по каждому шаблону и покадровая раскадровка прокрутки |
| 16 подробных повествовательных разборов | Другая оптика: не числа, а задача читателя — афиша, календарь, оглавление номера, отчёт |
| Исследование семи опубликованных сайтов (Druk, Wakuli, Jo Iijima, Casa Matilde и другие) | Материал не из каталога шаблонов, а из живой практики |
| `readymag-atlas/design-system/readymag-patterns.md` | Привязка приёмов к разделам приходского сайта |

Разделение простое: там — снимки, раскадровка и повествование, здесь — числа, принципы
и проверочные списки для вёрстки.

## Внутренние документы проекта

- `сайт/v2/front/DESIGN.md` — источник правды по интерфейсной
  сборке: секции, компоненты, токены, правила hover и приёмки. Этот справочник не отменяет
  его, а объясняет, откуда взяты числа.
