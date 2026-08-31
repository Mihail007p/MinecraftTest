# ЖУРНАЛ РАБОТЫ — MinecraftTest

> **Файл непрерывности.** Если чат/сессия оборвались (сбой, лимиты, новый чат) — новый агент должен прочитать этот файл целиком и продолжить с места остановки.
> Последнее обновление: 2026-08-31 (Asia/Vladivostok)

---

## 1. Единственная ссылка на игру (raw.githack)

```
https://raw.githack.com/Mihail007p/MinecraftTest/arena/01a057bb-minecrafttest/index.html
```

Обновляется автоматически при каждом коммите в рабочую ветку. Открывается в браузере телефона (Tecno Pova Neo 3) и на компьютере.

---

## 2. Что это за проект

- `index.html` (~1.4 МБ, ~19 000 строк) — одностраничный клон Minecraft. Three.js r128 встроен прямо в файл.
- Оптимизирован под слабый Android-телефон Tecno Pova Neo 3 (8 ГБ, Mali-G52): низкие настройки включаются автоматически (детект по железу/UA, pixelRatio 0.55).
- Мир: бесконечные чанки 16×128×16, классическая вода, деревня с жителями (Иван, Маша, Борис, Анна, Глеб…), мобы, крафт, печь, инвентарь, день/ночь, лодка.
- Управление мобильное: виртуальный джойстик слева, взгляд свайпом по правой половине, кнопки (прыжок / поставить блок) справа. Портретная ориентация блокируется подсказкой «Поверни телефон».

---

## 3. Статус: что сделано и проверено

- [x] Игра загружается и рендерится без ошибок (0 ошибок консоли) в headless Chromium + SwiftShader
- [x] Автотесты `tests/game-test.js`: **12/12 шагов PASS** (спавн, камера, ходьба, прыжок, добыча блока, установка блока, инвентарь, день/ночь, портрет/альбом телефона, отсутствие JS-ошибок)
- [x] Инфраструктура тестов закоммичена и запушена (коммит `a3b4733`)
- [x] **Оптимизация производительности (коммит `477dfa3`)** — см. раздел 9 «Производительность»
- [ ] Не покрыто тестами: мобы и бой, торговля с жителями, крафт/печь, вода/плавание/лодка, экран смерти/респаун, сохранения
- [ ] Проверить производительность на реальном телефоне (в песочнице только software-рендер)

---

## 4. Git

- Репозиторий: https://github.com/Mihail007p/MinecraftTest.git (remote `origin`)
- **Рабочая ветка: `arena/01a057bb-minecrafttest`** — сессия Arena привязана к ней. Работать ТОЛЬКО в ней, никогда не переключаться на другие ветки.
- Последний коммит: `a3b4733` «Добавлена инфраструктура headless-тестирования игры»
- `main` отстаёт от рабочей ветки на 1 коммит (содержит только игру без `tests/`).

---

## 5. Окружение песочницы (как воспроизвести с нуля)

В песочнице **заблокировано**: cdn.playwright.dev, Google storage, deb.debian.org/apt-репозитории, Docker Hub, gitlab, jsdelivr, unpkg.
**Доступно**: npm-реестр, GitHub (api.github.com, codeload.github.com), PyPI.

Проверенная схема установки Chromium:

1. Node 22 и Python 3.11 уже стоят в системе.
2. `mkdir -p ~/test-tools && cd ~/test-tools && npm init -y`
3. `npm i puppeteer-core @sparticuz/chromium` — ставится из npm-реестра.
4. Библиотеки NSS/NSPR (без них chromium падает с `libnspr4.so: not found`):
   - `libnss3.so`, `libnssutil3.so` — скачать tarball из https://github.com/melon-gg/libnss3.so (через `https://codeload.github.com/melon-gg/libnss3.so/tar.gz/refs/heads/main`).
   - `libnspr4.so`, `libplc4.so`, `libplds4.so` — собрать из исходников https://github.com/mozilla/nspr:
     ```
     ./configure --prefix=$HOME/nspr --enable-64bit && make -j$(nproc) && make install
     ```
     ⚠️ Без `--enable-64bit` configure определяет i386, и сборка падает на `bits/libc-header-start.h`.
   - Все `.so` сложить в `~/chromlibs/`.
5. SwiftShader: node-скрипт вызывает `inflate()` из `@sparticuz/chromium` для `bin/*.tar.br`
   (пакет распаковывает в `/tmp`: `libGLESv2.so`, `libEGL.so`, `vk_swiftshader_icd.json`, `/tmp/fonts`, `/tmp/al2023`).
   Готовый пример был в `/home/user/test-tools/extract-br.mjs` (сейчас можно написать заново по README пакета).
6. Проверка: `LD_LIBRARY_PATH=$HOME/chromlibs:/tmp /tmp/chromium --version` → `Chromium 149.0.7827.0`.
7. Аргументы браузера (уже есть в `tests/*.js`):
   `--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --disable-dev-shm-usage`
   Puppeteer: `headless: 'shell'`.

⚠️ `LD_LIBRARY_PATH` нельзя полагаться на переменную bash-вызова (каждый вызов — новый процесс).
Тесты выставляют его сами через `process.env.CHROM_LIBS`:
```
CHROM_LIBS=/home/user/chromlibs:/tmp node tests/game-test.js
```

---

## 6. Как запустить и проверить

1. **Сервер игры (live preview для пользователя):** из корня репо
   `python3 -m http.server 8080 --bind 0.0.0.0` (запускать через start_process, имя «Minecraft игра»).
2. **Быстрая проверка:** `CHROM_LIBS=/home/user/chromlibs:/tmp URL=http://127.0.0.1:8080/ node tests/shot.js`
   → `tests/shots/game.png` + состояние (WebGL-рендерер, ошибки консоли).
3. **Полный сценарий:** `CHROM_LIBS=… node tests/game-test.js`
   → `tests/report/report.json` + скриншоты `01-*.png … 11-*.png`. Выходной код: 0 = всё OK, 2 = есть провалы, 3 = сбой.
4. **Прицельная отладка:** `tests/debug-move.js` (позиция/скорость игрока по кадрам), `tests/debug-mine.js` (raycast, mining, дропы).
5. **«Зрение» (анализ скриншотов):** `python3 tests/vision.py file.png [file2.png]`
   — палитра, области «небо/трава», яркость, diff между кадрами. Требует Pillow:
   `pip3 install --break-system-packages pillow`.

---

## 7. Ключевые места кода (index.html; номера строк могут сдвигаться)

| Строка (примерно) | Что там |
|---|---|
| ~1494 | Константы мира: `CHUNK_SIZE=16`, `CHUNK_HEIGHT=128`, `WATER_LEVEL=63`, `RENDER_DISTANCE=2`, все id `BLOCK_*`/`ITEM_*` |
| ~2413 | Пиксель-арт иконки блоков (canvas), хотбар `#hotbar`, `selectedSlotIndex` |
| ~3821 | Детект слабых устройств: `IS_LOW_END`, `PERF` (pixelRatio 0.55 для Pova Neo 3) |
| ~3884 | `renderer` (WebGL + fallback), `scene`, `camera` (PerspectiveCamera 75°), туман, материалы (вода — Lambert) |
| ~6241 | `spawnBlockDrop`; ~6272 — физика и подбор дропов |
| ~8709 | Объект `player` (pos, vel, yaw, pitch, health, oxygen, boating…) |
| ~8748 | `placePlayerAtSpawn` — выбор места спавна, деревня, `seedVillageMobs` |
| ~8885 | Урон, смерть (`death-screen`), `respawnPlayer` |
| ~9060 | День/ночь: `DAY_DURATION=120`, `cycleTimer`, `isNightNow()`, `toggleForcedNight` |
| ~9256 | Тач-управление: джойстик (`moveInput`), взгляд, `beginTouchMine` |
| ~9381 | Кнопка прыжка (`touchstart`); ~10540 — кнопка установки блока |
| ~9461 | Майнинг: `MINE_ARM_DELAY=0.55`, `mineSeconds`, `canHarvest` |
| ~11158 | Главный цикл: `const dt = Math.min((currentTime - lastTime) / 1000, 0.05)` |

---

## 8. Важные находки (не потерять!)

1. **dt кламп теперь 0.1 с + физика подшагами 0.033** (было 0.05 — slow-motion при FPS<20).
   В песочнице SwiftShader даёт ~5-8 FPS, поэтому тест ждёт завершения добычи адаптивно.
2. **`page.touchscreen.*` в Puppeteer медленный** (CDP-раундтрипы растягивают жест в ~5–7 раз).
   В тестах используется синтетический `TouchEvent` через `page.evaluate` (см. `touchEvent` в `tests/game-test.js`).
3. Прыжок и установка блока слушают `touchstart` (не `click`).
4. Майнинг: замах 0.55 с + `mineSeconds`: трава/земля 0.55 с, бревно 1.15 с, камень 2.6 с
   (без кирки ×2.6 и блок исчезает с тостом «Нужна кирка»).
5. Дропы притягиваются к игроку с 2.2 бл., подбираются на дистанции < 0.6.
6. Спавн: игрок появляется в деревне (позиция ~(−1.5, 75, 2.5)), стартовый инвентарь пуст.
7. Двери жителей и калитки меняют блоки мира — их изменения теперь silent (иначе фризы на пересборку чанка).

---

## 9. Производительность (разбор лагов 2026-08-31)

Замеры headless-профилировщиком (`node profile.js`, `profile2.js`, `steady.js`, `final-perf.js` в test-tools;
в репозитории копии не обязательны — при необходимости воссоздать по образцу `tests/game-test.js`).

Было → стало (в песочнице, стоя на спавне):

| Метрика | Было | Стало |
|---|---|---|
| Draw calls (renderer.info) | **601** | **46–55** (в движении ≤144) |
| Мешей декора | 1576 | 10 слияний + скрытые оригиналы |
| rebuildChunkMesh | 26.5 мс/вызов (макс 51.6) | 3.8 мс/вызов (макс 4.7) — 7× |
| updateInfiniteChunks (очередь пересборок) | 28–36 мс/с | ~0 мс/с |
| updateMobsManager | 3.5 мс/с | 0.3 мс/с |
| DOM-мутаций | каждый кадр (таймер дня, кнопка ночи) | только при изменении |
| dt кламп | 0.05 (slow-motion при FPS<20) | 0.1 + физика подшагами 0.033 |

Причины лагов и исправления (все в `index.html`):
1. **601 draw call** — декор (посевы/факелы/верстаки) создавался мешем на каждую деталь.
   → `mergeDecorMeshes()`: слияние в один меш на материал (после `rebuildDecor`).
   ВАЖНО: при каждом rebuildDecor старые слитые геометрии освобождаются (userData.merged).
2. **Фризы 26–51 мс** — жители открывали двери: `setDoorOpen`/`toggleGate` вызывали `setBlock`
   без silent → мгновенная пересборка всего чанка. → двери/калитки теперь всегда silent
   (пересборка через грязную очередь), а `setBlock` мгновенно пересобирает только чанк
   в радиусе 14 блоков от игрока.
3. **Медленный rebuildChunkMesh** — 128 слоёв × 6 мировых `getBlock`. → локальное чтение
   `chunk.blocks[]` для внутренних соседей (мир — только на границе) + диапазон
   `minY..maxY` (ведётся в `Chunk.setBlock`).
4. **Грязная очередь** — обрабатывается в animate каждый кадр, не более 1–2 чанков за кадр.
5. **Каждый кадр**: `timeDisplay.innerText`, `syncNightButton`, traverse материалов всех мобов
   (сброс цветов), `new THREE.Color()` ×7 в дневном цикле, speech-пузыри каждые 0.05 с
   у слабых устройств (чаще, чем у мощных!). → всё затроттлено/кэшировано.
6. **Адаптивный pixelRatio** осциллировал (24/54 fps) → гистерезис 20/58, кулдауны 6/8.
7. **Мобы дальше 44 блоков** скрываются на слабых устройствах (туман их и так прячет).

Не трогались (сознательно): меши мобов (139+ draw calls — анимация частей), меш облаков,
водные грани, точечные источники света факелов (6 шт.).

---

## 9б. TODO / идеи на будущее

- [ ] Расширить тесты: мобы и бой, торговля, крафт/печь, вода/плавание/лодка, диалоги жителей, смерть/респаун
- [ ] Проверить FPS на реальном Tecno Pova Neo 3 (в песочнице только SwiftShader ~7 fps, не показатель)
- [ ] Опционально: слить части мобов в меньшее число мешей (сейчас ~139 draw calls на мобов)
- [ ] PR из `arena/01a057bb-minecrafttest` в `main` после стабилизации

---

## 10. Инструкция для нового агента (новый чат)

1. **Прочитай этот файл целиком.**
2. `cd /home/user/MinecraftTest && git status && git log --oneline -5` — убедись, что на ветке `arena/01a057bb-minecrafttest`.
3. Если песочница новая — восстанови окружение по разделу 5 (npm i, chromlibs, SwiftShader).
4. Запусти сервер: `python3 -m http.server 8080 --bind 0.0.0.0` (инструмент start_process) — это live preview для пользователя.
5. Прогони `tests/shot.js`, затем `tests/game-test.js`. Скриншоты анализируй через `tests/vision.py`.
6. Правь только `index.html` и `tests/`. Коммить и пушь:
   `git push origin arena/01a057bb-minecrafttest`.
7. **Не переключай ветки** — сессия Arena привязана к `arena/01a057bb-minecrafttest`, работа в других ветках не будет засчитана.
8. Пользователь русскоязычный — отвечай на русском.
