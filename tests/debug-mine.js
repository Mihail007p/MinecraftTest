// Отладка майнинга: что в прицеле, старт mining, дропы
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

  const te = (x, y, type, id) => page.evaluate(({ x, y, type, id }) => {
    const target = document.elementFromPoint(x, y) || document.body;
    const t = new Touch({ identifier: id, target, clientX: x, clientY: y, screenX: x, screenY: y, pageX: x, pageY: y, radiusX: 2, radiusY: 2, force: 1 });
    target.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, composed: true,
      changedTouches: [t], targetTouches: type === 'touchend' ? [] : [t], touches: type === 'touchend' ? [] : [t] }));
  }, { x, y, type, id });

  const st = () => page.evaluate(() => {
    const hit = raycastFromScreen(window.innerWidth / 2, window.innerHeight / 2 - 40, 6.5);
    return {
      pos: [ +player.pos.x.toFixed(1), +player.pos.y.toFixed(1), +player.pos.z.toFixed(1) ],
      pitch: +player.pitch.toFixed(2), yaw: +player.yaw.toFixed(2),
      hit: hit.hit ? { type: hit.blockType, x: hit.block.x, y: hit.block.y, z: hit.block.z } : null,
      mining: mining ? { t: +mining.t.toFixed(2), x: mining.x, y: mining.y, z: mining.z, type: mining.type } : null,
      pending: minePending ? { wait: +minePending.wait.toFixed(2), type: minePending.type } : null,
      drops: droppedItems.map((d) => ({ type: d.type, age: +d.age.toFixed(1), onGround: d.onGround })),
      invSum: inventory.reduce((s, x) => s + (x ? x.count : 0), 0),
      mineBar: (document.getElementById('mine-bar') || {}).style && document.getElementById('mine-bar').style.display,
    };
  });

  console.log('A(взгляд вперёд):', JSON.stringify(await st()));

  // взгляд вниз
  await te(1280 * 0.72, 360, 'touchstart', 1);
  for (let i = 1; i <= 5; i++) { await te(1280 * 0.72, 360 + i * 40, 'touchmove', 1); await sleep(60); }
  await te(1280 * 0.72, 560, 'touchend', 1);
  await sleep(300);
  console.log('B(взгляд вниз):', JSON.stringify(await st()));

  // долгий тап в прицел 2.5с
  await te(640, 320, 'touchstart', 2);
  for (let i = 0; i < 5; i++) { await sleep(500); console.log('MINE', i, JSON.stringify(await st())); }
  await te(640, 320, 'touchend', 2);
  for (let i = 0; i < 6; i++) { await sleep(400); console.log('AFTER', i, JSON.stringify(await st())); }

  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(3); });
