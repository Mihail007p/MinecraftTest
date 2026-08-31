// Прицельная отладка: движение джойстиком, прыжок, смерть
process.env.LD_LIBRARY_PATH = (process.env.CHROM_LIBS || '') + ':' + process.env.LD_LIBRARY_PATH || process.env.LD_LIBRARY_PATH;
(async () => {
  const puppeteer = require('puppeteer-core');
  const { default: chromium } = await import('@sparticuz/chromium');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const browser = await puppeteer.launch({
    executablePath: await chromium.executablePath(),
    args: [...chromium.args, '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1280,720'],
    headless: 'shell',
    defaultViewport: { width: 1280, height: 720, isMobile: false, hasTouch: true },
  });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('PAGEERR', String(e)));
  await page.goto('http://127.0.0.1:8080/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof player !== 'undefined' && chunks.size > 0, { timeout: 60000 });
  await sleep(4000);

  const st = () => page.evaluate(() => ({
    t: Math.round(performance.now()),
    x: +player.pos.x.toFixed(2), y: +player.pos.y.toFixed(2), z: +player.pos.z.toFixed(2),
    vx: +player.vel.x.toFixed(2), vy: +player.vel.y.toFixed(2), vz: +player.vel.z.toFixed(2),
    onGround: player.onGround, isDead: player.isDead,
    deathShown: (document.getElementById('death-screen') || {}).style && document.getElementById('death-screen').style.display === 'flex',
    health: player.health,
    mi: { x: +moveInput.x.toFixed(2), y: +moveInput.y.toFixed(2) },
    cycle: +cycleTimer.toFixed(1),
  }));

  console.log('START', JSON.stringify(await st()));

  // прыжок через прямое событие на кнопке (имитация пальца)
  const jb = await page.evaluate(() => { const r = document.getElementById('btn-jump').getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height/2, w: r.width, h: r.height }; });
  console.log('btn-jump rect:', JSON.stringify(jb));
  await page.touchscreen.touchStart(jb.x, jb.y); await sleep(60); await page.touchscreen.touchEnd();
  for (let i = 0; i < 10; i++) { console.log('JUMP', JSON.stringify(await st())); await sleep(100); }

  // джойстик: зона
  const jz = await page.evaluate(() => { const r = document.getElementById('joystick-zone').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width/2, cy: r.top + r.height/2 }; });
  console.log('joystick zone:', JSON.stringify(jz));

  await page.touchscreen.touchStart(jz.cx, jz.cy);
  await page.touchscreen.touchMove(jz.cx + 40, jz.cy - 40); // полный ход вперёд-вправо
  for (let i = 0; i < 14; i++) { console.log('WALK', JSON.stringify(await st())); await sleep(100); }
  await page.touchscreen.touchEnd();
  for (let i = 0; i < 5; i++) { console.log('STOP', JSON.stringify(await st())); await sleep(120); }

  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(3); });
