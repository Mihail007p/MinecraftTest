// Лист всех текстур блоков -> _tiles_preview.png (для визуальной проверки).
require('./harness.js');
const fs = require('fs'), zlib = require('zlib');
const D = loadGame(), MC = D.MC_TEX;
const cols = 8, SC = 3, T = 32, PAD = 4;
const ids = []; for (let i = 0; i < 64; i++) if (MC.tiles[i]) ids.push(i);
const rows = Math.ceil(ids.length / cols);
const W = cols * (T * SC + PAD) + PAD, H = rows * (T * SC + PAD) + PAD;
const buf = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { buf[i * 4] = 25; buf[i * 4 + 1] = 25; buf[i * 4 + 2] = 32; buf[i * 4 + 3] = 255; }
ids.forEach((id, k) => {
  const cx = PAD + (k % cols) * (T * SC + PAD), cy = PAD + Math.floor(k / cols) * (T * SC + PAD);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const n = parseInt((MC.tiles[id][y * T + x] || '#7a7a7a').slice(1), 16);
    for (let sy = 0; sy < SC; sy++) for (let sx = 0; sx < SC; sx++) {
      const p = ((cy + y * SC + sy) * W + (cx + x * SC + sx)) * 4;
      buf[p] = (n >> 16) & 255; buf[p + 1] = (n >> 8) & 255; buf[p + 2] = n & 255; buf[p + 3] = 255;
    }
  }
});
let tb = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; tb[n] = c >>> 0; }
const crc = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = tb[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const t = Buffer.from(ty); const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t, d]))); return Buffer.concat([l, t, d, c]); };
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; Buffer.from(buf.buffer, y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1); }
const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 6;
fs.writeFileSync(__dirname + '/../_tiles_preview.png', Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log('тайлов:', ids.length);
