// Заглушки браузера, чтобы запускать движок игры в Node без браузера и
// проверять генерацию мира, сборку чанков, иконки и т.д.
// Использование: node devtools/<скрипт>.js  (сначала devtools/extract.py)
function makeCtx2D(o) {
  const ctx = {
    imageSmoothingEnabled: true, fillStyle: '#000', strokeStyle: '#000', lineWidth: 1,
    font: '', textAlign: '', globalAlpha: 1,
    fillRect(x, y, w, h) {
      let hex = typeof ctx.fillStyle === 'string' ? ctx.fillStyle : '#000';
      if (hex[0] !== '#') hex = '#000000';
      let a = 255;
      if (hex.length === 9) { a = parseInt(hex.slice(7, 9), 16); hex = hex.slice(0, 7); }
      if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
      const n = parseInt(hex.slice(1), 16) || 0, r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      x |= 0; y |= 0; w |= 0; h |= 0;
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
        if (xx < 0 || yy < 0 || xx >= o.width || yy >= o.height) continue;
        const p = (yy * o.width + xx) * 4;
        o._buf[p] = r; o._buf[p + 1] = g; o._buf[p + 2] = b; o._buf[p + 3] = a;
      }
    },
    clearRect(x, y, w, h) {
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
        if (xx < 0 || yy < 0 || xx >= o.width || yy >= o.height) continue;
        const p = (yy * o.width + xx) * 4;
        o._buf[p] = o._buf[p + 1] = o._buf[p + 2] = o._buf[p + 3] = 0;
      }
    },
    createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h }; },
    getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h }; },
    putImageData(img) { if (img && img.data && o._buf && img.data.length === o._buf.length) o._buf.set(img.data); },
    drawImage() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, fill() {}, stroke() {},
    save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, fillText() {}, strokeRect() {},
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
    setTransform() {}, measureText() { return { width: 10 }; }
  };
  return ctx;
}
let elId = 0;
function makeElement(tag) {
  return {
    tagName: (tag || 'div').toUpperCase(), nodeName: (tag || 'div').toUpperCase(), id: 'el' + (elId++),
    style: new Proxy({}, { get: (t, k) => t[k] !== undefined ? t[k] : '', set: (t, k, v) => { t[k] = v; return true; } }),
    dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    children: [], childNodes: [], width: 300, height: 150, _buf: null,
    innerHTML: '', innerText: '', textContent: '', value: '', checked: false, clientWidth: 800, clientHeight: 400,
    appendChild(c) { this.children.push(c); return c; }, removeChild(c) { return c; }, insertBefore(c) { return c; },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {}, focus() {}, blur() {}, click() {},
    querySelector() { return makeElement('div'); }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { left: 0, top: 0, right: 800, bottom: 400, width: 800, height: 400, x: 0, y: 0 }; },
    getContext(kind) {
      if (kind === '2d') { if (!this._buf) this._buf = new Uint8Array(this.width * this.height * 4); return makeCtx2D(this); }
      return null;
    },
    toDataURL() { return 'data:image/png;base64,STUB'; },
    requestFullscreen() { return Promise.resolve(); }, scrollIntoView() {}, remove() {}
  };
}
const elements = {};
global.document = {
  createElement: (t) => makeElement(t), createElementNS: (ns, t) => makeElement(t),
  getElementById: (id) => { if (!elements[id]) elements[id] = makeElement('div'); return elements[id]; },
  querySelector: () => makeElement('div'), querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {},
  body: makeElement('body'), documentElement: makeElement('html'), head: makeElement('head'),
  createTextNode: (t) => ({ text: t }), hidden: false, visibilityState: 'visible',
  fullscreenElement: null, exitFullscreen() { return Promise.resolve(); }
};
global.navigator = {
  userAgent: 'Mozilla/5.0 (Linux; Android 12; TECNO LG6n Pova Neo 3) AppleWebKit/537.36 Chrome/120 Mobile',
  maxTouchPoints: 5, hardwareConcurrency: 4, deviceMemory: 4, vibrate() {}, standalone: false,
  serviceWorker: { register() { return Promise.resolve(); } }
};
const store = {};
global.localStorage = {
  getItem: k => k in store ? store[k] : null, setItem: (k, v) => { store[k] = '' + v; },
  removeItem: k => { delete store[k]; }, clear() {}
};
let rafCount = 0, rafCB = null;
global.requestAnimationFrame = (cb) => { rafCB = cb; return ++rafCount; };
global.cancelAnimationFrame = () => {};
global.performance = { now: () => Date.now() };
global.Image = function () { this.onload = null; Object.defineProperty(this, 'src', { set(v) {} }); };
global.Audio = function () { return { play() { return Promise.resolve(); }, pause() {}, addEventListener() {} }; };
global.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
global.screen = { orientation: { lock() { return Promise.resolve(); }, unlock() {}, type: 'landscape-primary', addEventListener() {} }, width: 800, height: 400 };
global.window = global; global.self = global;
global.innerWidth = 800; global.innerHeight = 400; global.devicePixelRatio = 2;
global.addEventListener = () => {}; global.removeEventListener = () => {};
global.setInterval = () => 0; global.clearInterval = () => {};
global.alert = () => {}; global.confirm = () => true; global.prompt = () => null;
global.__RAF = () => rafCB;

// Загружает three.js и код игры из index.html, возвращает объект __DBG.
global.loadGame = function () {
  const fs = require('fs');
  const dir = __dirname;
  (function (exports, module, define) { eval(fs.readFileSync(dir + '/three.js', 'utf8')); })();
  (function (exports, module, define) { eval(fs.readFileSync(dir + '/game.js', 'utf8')); })();
  return globalThis.__DBG;
};
