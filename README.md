# MinecraftTest

Мобильная веб-версия Minecraft-подобной песочницы (один файл `index.html`, Three.js внутри).

## Запуск через githack

Основная ссылка — **rawcdn** (боевой CDN githack, кэш, быстрый на телефоне):

```
https://rawcdn.githack.com/Mihail007p/MinecraftTest/arena/01a0432c-minecrafttest/index.html
```

Запасная — dev-домен githack (он лимитирует трафик и на большом файле часто
отваливается, поэтому он именно запасной):

```
https://raw.githack.com/Mihail007p/MinecraftTest/arena/01a0432c-minecrafttest/index.html
```

**Важно:** для HTML-страниц githack сначала показывает свою заставку
«One more step / External Content Notice». Надо один раз нажать зелёную кнопку
**«Open the page»** — после этого откроется игра, и браузер запомнит согласие,
дальше ссылка будет открываться сразу. Убрать эту заставку со стороны
репозитория нельзя — это политика самого githack для HTML.

## Если заставка мешает — ссылки без неё

htmlpreview (проверено, открывается сразу):

```
https://htmlpreview.github.io/?https://github.com/Mihail007p/MinecraftTest/blob/arena/01a0432c-minecrafttest/index.html
```

GitHub Pages — самый быстрый вариант, включается один раз:

1. https://github.com/Mihail007p/MinecraftTest/settings/pages
2. **Source** → `Deploy from a branch`
3. **Branch** → `arena/01a0432c-minecrafttest`, папка `/ (root)` → **Save**
4. Через 1–2 минуты игра будет тут: **https://mihail007p.github.io/MinecraftTest/**

## Локально

```bash
git clone https://github.com/Mihail007p/MinecraftTest.git
cd MinecraftTest
python3 -m http.server 8080
# открыть http://localhost:8080/index.html
```

Или скачать `index.html` и открыть его в Chrome (Загрузки → открыть в браузере) —
файл самодостаточный, интернет для игры не нужен.

> ⚠️ jsDelivr (`cdn.jsdelivr.net`) не подходит: он отдаёт HTML как обычный
> текст, игра не запускается.
