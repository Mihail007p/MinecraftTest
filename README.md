# MinecraftTest

Мобильная веб-версия Minecraft-подобной песочницы (один файл `index.html`, Three.js внутри).

## Как запустить в браузере

### 1. Рабочая ссылка (проверена)

htmlpreview — открывается сразу, без предупреждений:

https://htmlpreview.github.io/?https://github.com/Mihail007p/MinecraftTest/blob/arena/01a0432c-minecrafttest/index.html

### 2. GitHub Pages — лучший вариант (включается один раз)

1. Открой https://github.com/Mihail007p/MinecraftTest/settings/pages
2. **Source** → `Deploy from a branch`
3. **Branch** → `arena/01a0432c-minecrafttest`, папка `/ (root)` → **Save**
4. Через 1–2 минуты игра будет тут:

   **https://mihail007p.github.io/MinecraftTest/**

Это самая быстрая и стабильная ссылка: обычный хостинг, кэш CDN, можно
добавить на главный экран телефона как приложение.

### 3. githack (нужен один клик)

https://raw.githack.com/Mihail007p/MinecraftTest/arena/01a0432c-minecrafttest/index.html

Сервис показывает страницу-предупреждение, надо нажать «Open the page».

### 4. Локально

```bash
git clone https://github.com/Mihail007p/MinecraftTest.git
cd MinecraftTest
python3 -m http.server 8080
# открыть http://localhost:8080/index.html
```

Или просто скачать `index.html` и открыть его в Chrome на телефоне
(Загрузки → открыть файл в браузере).

> ⚠️ jsDelivr (`cdn.jsdelivr.net`) для этого файла не подходит: он отдаёт
> HTML как обычный текст, игра не запускается.
