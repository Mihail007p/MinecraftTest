// Headless-тест игры: загрузка, ошибки консоли, скриншоты
const path = require('path');
const fs = require('fs');

const URL = process.env.URL || 'http://127.0.0.1:8080/';
const OUT = process.env.OUT || path.join(__dirname, 'shots');
const W = parseInt(process.env.W || '1600', 10);
const H = parseInt(process.env.H || '720', 10);
const WAIT_MS = parseInt(process.env.WAIT || '7000', 10);

(async () => {
  if (process.env.CHROM_LIBS) process.env.LD_LIBRARY_PATH = process.env.CHROM_LIBS + ':' + (process.env.LD_LIBRARY_PATH || '');
  const puppeteer = require('puppeteer-core');
  const { default: chromium } = await import('@sparticuz/chromium');
  fs.mkdirSync(OUT, { recursive: true });
  const execPath = await chromium.executablePath();
  console.log('chromium:', execPath);
  const browser = await puppeteer.launch({
    executablePath: execPath,
    args: [
      ...chromium.args,
      '--no-sandbox',
      '--disable-gpu-sandbox',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--disable-dev-shm-usage',
      '--window-size=' + W + ',' + H,
    ],
    headless: 'shell',
    defaultViewport: { width: W, height: H, deviceScaleFactor: 1, isMobile: false, hasTouch: true },
  });
  const page = await browser.newPage();
  const errors = [];
  const logs = [];
  page.on('console', (m) => {
    const t = m.type();
    if (t === 'error' || t === 'warning') logs.push('[' + t + '] ' + m.text());
  });
  page.on('pageerror', (e) => errors.push(String((e && e.stack) || e)));
  page.on('requestfailed', (r) => {
    const u = r.url();
    if (!u.startsWith('data:')) errors.push('REQFAIL: ' + u + ' ' + (r.failure() && r.failure().errorText));
  });

  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch (e) {
    errors.push('GOTO: ' + e.message);
  }

  try {
    await page.waitForFunction(() => {
      const c = document.getElementById('game-canvas');
      return c && c.width > 100 && c.height > 100;
    }, { timeout: 30000 });
  } catch (e) {
    errors.push('CANVAS: ' + e.message);
  }

  await new Promise((r) => setTimeout(r, WAIT_MS));

  const info = await page.evaluate(() => {
    const c = document.getElementById('game-canvas');
    const err = document.getElementById('boot-error');
    const hint = document.getElementById('rotate-hint');
    return {
      canvas: c ? { w: c.width, h: c.height } : null,
      bootError: err && err.style.display !== 'none' ? err.textContent : null,
      rotateHint: hint && hint.style.display !== 'none' ? 'shown' : 'hidden',
      title: document.title,
      webgl: (() => {
        try {
          const gl = document.createElement('canvas').getContext('webgl');
          if (!gl) return false;
          const dbg = gl.getExtension('WEBGL_debug_renderer_info');
          return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'webgl-ok';
        } catch (e) {
          return 'err: ' + e.message;
        }
      })(),
      renderer: (() => {
        try { return typeof THREE !== 'undefined' && THREE.REVISION ? 'three r' + THREE.REVISION : 'no THREE'; } catch (e) { return 'err'; }
      })(),
    };
  });

  await page.screenshot({ path: path.join(OUT, 'game.png') });

  await page.mouse.click(W / 2, H / 2);
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(OUT, 'game-after-tap.png') });

  console.log(JSON.stringify({ info, errors, logs: logs.slice(0, 30) }, null, 2));
  await browser.close();
  process.exit(errors.length ? 2 : 0);
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(3);
});
