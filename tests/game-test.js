// Интерактивный тест игры v2: синхронные тач-события внутри страницы, точные замеры
const fs = require('fs');
const path = require('path');

const URL = process.env.URL || 'http://127.0.0.1:8080/';
const OUT = process.env.OUT || path.join(__dirname, 'report');
const W = parseInt(process.env.W || '1280', 10);
const H = parseInt(process.env.H || '720', 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  if (process.env.CHROM_LIBS) process.env.LD_LIBRARY_PATH = process.env.CHROM_LIBS + ':' + (process.env.LD_LIBRARY_PATH || '');
  const puppeteer = require('puppeteer-core');
  const { default: chromium } = await import('@sparticuz/chromium');
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: await chromium.executablePath(),
    args: [...chromium.args, '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle',
           '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
           '--window-size=' + W + ',' + H],
    headless: 'shell',
    defaultViewport: { width: W, height: H, deviceScaleFactor: 1, isMobile: false, hasTouch: true },
  });

  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
  page.on('requestfailed', (r) => { if (!r.url().startsWith('data:')) errors.push('REQFAIL ' + r.url()); });

  const R = { steps: [], errors };
  const shot = async (name) => {
    const f = path.join(OUT, name + '.png');
    await page.screenshot({ path: f });
    return f;
  };
  const step = (name, ok, detail) => R.steps.push({ name, ok: !!ok, detail: detail || '' });

  // Синхронная симуляция тача внутри страницы (без задержек CDP)
  const touchEvent = (x, y, type, id) => page.evaluate(({ x, y, type, id }) => {
    const target = document.elementFromPoint(x, y) || document.body;
    const t = new Touch({ identifier: id, target, clientX: x, clientY: y,
                          screenX: x, screenY: y, pageX: x, pageY: y, radiusX: 2, radiusY: 2, force: 1 });
    const ev = new TouchEvent(type, { bubbles: true, cancelable: true, composed: true,
      changedTouches: [t], targetTouches: type === 'touchend' ? [] : [t], touches: type === 'touchend' ? [] : [t] });
    target.dispatchEvent(ev);
    return true;
  }, { x, y, type, id });
  const tap = async (x, y) => { await touchEvent(x, y, 'touchstart', 1); await touchEvent(x, y, 'touchend', 1); };
  const holdTouch = async (x, y, ms, id = 2) => {
    await touchEvent(x, y, 'touchstart', id);
    await sleep(ms);
    await touchEvent(x, y, 'touchend', id);
  };
  const dragTouch = async (x1, y1, x2, y2, ms, id = 3) => {
    await touchEvent(x1, y1, 'touchstart', id);
    await sleep(Math.max(50, ms * 0.2));
    const steps = 4;
    for (let i = 1; i <= steps; i++) {
      await touchEvent(x1 + (x2 - x1) * i / steps, y1 + (y2 - y1) * i / steps, 'touchmove', id);
      await sleep(ms / steps);
    }
    await touchEvent(x2, y2, 'touchend', id);
  };
  const elCenter = (sel) => page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, sel);
  const tapSel = async (sel) => { const c = await elCenter(sel); if (!c) return false; await tap(c.x, c.y); return true; };

  const getState = () => page.evaluate(() => ({
    pos: { x: +player.pos.x.toFixed(2), y: +player.pos.y.toFixed(2), z: +player.pos.z.toFixed(2) },
    yaw: +player.yaw.toFixed(3), pitch: +player.pitch.toFixed(3),
    health: player.health, onGround: player.onGround, isDead: player.isDead,
    deathShown: document.getElementById('death-screen').style.display === 'flex',
    chunks: chunks.size,
    invSum: inventory.reduce((s, x) => s + (x ? x.count : 0), 0),
    sel: selectedSlotIndex,
    night: isNightNow(), cycle: +cycleTimer.toFixed(1),
  }));

  // ---- 1. Загрузка и спавн ----
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => {
    try { return typeof player !== 'undefined' && typeof chunks !== 'undefined' && chunks.size > 0 && player.pos.y > 10 && !player.isDead; } catch (e) { return false; }
  }, { timeout: 60000 });
  await sleep(4000);
  const s1 = await getState();
  step('Загрузка мира и спавн в деревне',
       s1.chunks > 0 && s1.pos.y > 10 && s1.health === 20 && errors.length === 0,
       `pos (${s1.pos.x}, ${s1.pos.y}, ${s1.pos.z}), чанков: ${s1.chunks}, HP: ${s1.health}`);
  await shot('01-boot');

  // ---- 2. FPS (инфо, в software-рендере) ----
  const fps = await page.evaluate(() => new Promise((resolve) => {
    let n = 0; const t0 = performance.now();
    const tick = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(tick); else resolve(Math.round(n / 3)); };
    requestAnimationFrame(tick);
  }));
  step('Частота кадров (инфо: headless software-рендер)', true, fps + ' fps в песочнице');

  // ---- 3. Поворот камеры ----
  const b3 = await getState();
  await dragTouch(W * 0.72, H * 0.45, W * 0.72 + 200, H * 0.45 + 80, 700);
  const a3 = await getState();
  step('Поворот камеры свайпом',
       Math.abs(a3.yaw - b3.yaw) > 0.1 || Math.abs(a3.pitch - b3.pitch) > 0.1,
       `yaw ${b3.yaw} -> ${a3.yaw}, pitch ${b3.pitch} -> ${a3.pitch}`);
  await shot('02-look');

  // ---- 4. Ходьба джойстиком (ровно 1.2 сек) ----
  const jz = await page.evaluate(() => {
    const r = document.getElementById('joystick-zone').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  const b4 = await getState();
  await touchEvent(jz.x, jz.y, 'touchstart', 4);
  await touchEvent(jz.x + 40, jz.y - 40, 'touchmove', 4);
  await sleep(1200);
  await touchEvent(jz.x + 40, jz.y - 40, 'touchend', 4);
  await sleep(400);
  const a4 = await getState();
  const dist4 = Math.hypot(a4.pos.x - b4.pos.x, a4.pos.z - b4.pos.z);
  step('Ходьба джойстиком (~5 бл/с)',
       dist4 > 1 && dist4 < 20,
       `пройдено ${dist4.toFixed(1)} бл. за 1.2с (скорость ${(dist4 / 1.2).toFixed(1)} бл/с)`);
  await shot('03-walk');

  // ---- 5. Прыжок ----
  const b5 = await getState();
  await tapSel('#btn-jump');
  let peakY = b5.pos.y;
  for (let i = 0; i < 12; i++) {
    const st = await getState();
    if (st.pos.y > peakY) peakY = st.pos.y;
    await sleep(90);
  }
  step('Прыжок (кнопка)', peakY - b5.pos.y > 0.4, `y ${b5.pos.y} -> пик ${peakY.toFixed(2)}`);
  await shot('04-jump');

  // ---- 6. Взгляд вниз, разрушение блока долгим тапом (адаптивно к скорости времени) ----
  const b6 = await getState();
  await dragTouch(W * 0.72, H * 0.45, W * 0.72, H * 0.75, 600); // взгляд вниз
  await sleep(300);
  // NB: dt в игре клампится 0.05с, поэтому при низком fps песочницы
  // игровое время течёт медленнее — держим тап до фактического разрушения.
  const holdStart = Date.now();
  await touchEvent(W / 2, H / 2 - 40, 'touchstart', 5);
  // держим до разрушения (мин. 2с, макс. 15с реального времени)
  let mined = null;
  for (let i = 0; i < 150; i++) {
    await sleep(100);
    mined = await page.evaluate(() => ({
      drops: droppedItems.length,
      mining: !!mining,
      invSum: inventory.reduce((s, x) => s + (x ? x.count : 0), 0),
    }));
    if (!mined.mining && (mined.drops > 0 || mined.invSum > b6.invSum)) break;
  }
  await touchEvent(W / 2, H / 2 - 40, 'touchend', 5);
  // ждём подбор дропа
  let a6 = await getState();
  for (let i = 0; i < 60 && a6.invSum <= b6.invSum; i++) { await sleep(200); a6 = await getState(); }
  step('Разрушение блока (долгий тап в прицел)',
       a6.invSum > b6.invSum,
       `предметы: ${b6.invSum} -> ${a6.invSum} (+${a6.invSum - b6.invSum}), дропы: ${mined.drops}, удержание ${((Date.now() - holdStart) / 1000).toFixed(1)}с`);
  await shot('05-mine');

  // ---- 7. Установка блока ----
  const b7 = await getState();
  await tapSel('#btn-place');
  await sleep(600);
  const a7 = await getState();
  const placedCheck = await page.evaluate(() => {
    const hit = raycastFromScreen(window.innerWidth / 2, window.innerHeight / 2 - 40, 6.5);
    return { hit: hit.hit, type: hit.blockType, place: hit.place };
  });
  step('Установка блока (кнопка place, взгляд в землю)',
       a7.invSum < b7.invSum,
       `предметы: ${b7.invSum} -> ${a7.invSum} (-${b7.invSum - a7.invSum}), в прицеле: ${JSON.stringify(placedCheck)}`);
  await shot('06-place');

  // ---- 8. Инвентарь ----
  await tapSel('#btn-inventory');
  await sleep(600);
  const invShown = await page.evaluate(() => {
    const ov = document.getElementById('inv-overlay');
    return !!(ov && ov.style.display !== 'none' && ov.style.display !== '');
  });
  step('Открытие инвентаря', invShown, invShown ? 'окно видно' : 'окно не открылось');
  await shot('07-inventory');
  await page.evaluate(() => { const el = document.getElementById('inv-close'); if (el) el.click(); });
  await sleep(400);

  // ---- 9. День/ночь ----
  const b9 = await getState();
  await tapSel('#btn-night');
  await sleep(500);
  const a9 = await getState();
  const toggled = a9.night !== b9.night;
  step('Переключение день/ночь', toggled, `cycleTimer ${b9.cycle} -> ${a9.cycle}, ночь: ${b9.night} -> ${a9.night}`);
  await shot('08-night');
  if (a9.night) { await tapSel('#btn-night'); await sleep(400); }

  // ---- 10. Ошибки за сессию ----
  step('Нет JS-ошибок за всю сессию', errors.length === 0, errors.slice(0, 5).join(' | '));

  // ---- 11. Телефон: портрет ----
  const phone = await browser.newPage();
  phone.on('pageerror', (e) => errors.push('[phone] ' + String(e)));
  await phone.setViewport({ width: 720, height: 1600, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await phone.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);
  const phoneState = await phone.evaluate(() => ({
    hintShown: (document.getElementById('rotate-hint') || {}).style && document.getElementById('rotate-hint').style.display === 'flex',
    canvas: (() => { const c = document.getElementById('game-canvas'); return c ? { w: c.width, h: c.height } : null; })(),
  }));
  await phone.screenshot({ path: path.join(OUT, '10-phone-portrait.png') });
  step('Телефон (портрет): подсказка «поверни телефон»', phoneState.hintShown === true,
       JSON.stringify(phoneState));

  // ---- 12. Телефон: альбом ----
  await phone.setViewport({ width: 1600, height: 720, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await sleep(2500);
  const landState = await phone.evaluate(() => ({
    hintShown: (document.getElementById('rotate-hint') || {}).style && document.getElementById('rotate-hint').style.display === 'flex',
    canvas: (() => { const c = document.getElementById('game-canvas'); return c ? { w: c.width, h: c.height } : null; })(),
  }));
  await phone.screenshot({ path: path.join(OUT, '11-phone-landscape.png') });
  step('Телефон (альбом): игра видна, подсказка скрыта',
       landState.hintShown === false && landState.canvas && landState.canvas.w > 0,
       JSON.stringify(landState));
  await phone.close();

  await shot('09-final');
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
  await browser.close();
  const failed = R.steps.filter((s) => !s.ok).length;
  console.log('ИТОГ: шагов', R.steps.length, '| провалено', failed, '| JS-ошибок', R.errors.length);
  process.exit(failed || R.errors.length ? 2 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(3); });
