// Рисует карту мира сверху: цвет = верхний блок колонки. Помогает увидеть,
// что реально лежит на поверхности (камень, руда, вода, тропинки).
require('./harness.js');
const fs = require('fs'), zlib = require('zlib');
const D = loadGame();
const R = Number(process.argv[2] || 160);
const COL = {0:[0,0,0],1:[92,168,60],2:[134,96,67],3:[160,160,160],4:[110,80,45],5:[156,110,68],
 6:[60,120,40],7:[220,200,154],8:[60,110,200],13:[150,110,70],29:[255,210,120],30:[150,110,60],
 31:[120,120,120],32:[194,166,115],33:[200,230,240],34:[140,100,60],35:[150,120,70],36:[150,120,80],
 37:[150,120,80],38:[200,60,60],39:[200,80,80],44:[138,138,138],45:[168,168,168],46:[255,140,50],
 47:[140,100,60],48:[110,110,110],53:[130,130,130],63:[150,150,150],73:[40,40,40],74:[216,192,160],
 75:[240,192,64],76:[94,231,255],85:[40,40,60],86:[240,250,255],87:[60,140,60],90:[180,230,250],
 91:[100,70,40],92:[170,170,160],94:[190,170,190],95:[180,100,70],96:[230,140,40],101:[120,80,45],102:[220,190,70]};
const W = 2 * R + 1;
const buf = new Uint8Array(W * W * 4);
const seen = {};
let rock = 0, total = 0;
const step = 24;
for (let px = -R; px <= R; px += step) {
  for (let pz = -R; pz <= R; pz += step) {
    D.player.pos.x = px; D.player.pos.z = pz;
    let t = 1000; for (let i = 0; i < 8; i++) { t += 16; global.__RAF()(t); }
    for (let x = px - 20; x <= px + 20; x++) for (let z = pz - 20; z <= pz + 20; z++) {
      if (x < -R || x > R || z < -R || z > R) continue;
      const key = x + ',' + z; if (seen[key]) continue;
      let top = 0, waterTop = false;
      for (let y = D.CHUNK_HEIGHT - 1; y > 0; y--) {
        const b = D.getBlock(x, y, z);
        if (b === 8) { waterTop = true; continue; }
        if (b !== 0) { top = b; break; }
      }
      if (!top) continue;
      seen[key] = 1; total++;
      if (top === 3 || top === 73 || top === 74 || top === 75 || top === 76 || top === 85) rock++;
      const c = waterTop ? [60, 110, 200] : (COL[top] || [255, 0, 255]);
      const p = ((z + R) * W + (x + R)) * 4;
      buf[p] = c[0]; buf[p + 1] = c[1]; buf[p + 2] = c[2]; buf[p + 3] = 255;
    }
  }
}
let tb = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; tb[n] = c >>> 0; }
const crc = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = tb[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const t = Buffer.from(ty); const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t, d]))); return Buffer.concat([l, t, d, c]); };
const raw = Buffer.alloc((W * 4 + 1) * W);
for (let y = 0; y < W; y++) { raw[y * (W * 4 + 1)] = 0; Buffer.from(buf.buffer, y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1); }
const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(W, 4); ih[8] = 8; ih[9] = 6;
fs.writeFileSync(__dirname + '/../_worldmap.png', Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log('колонок:', total, '| камень/руда сверху:', rock, '(' + (100 * rock / Math.max(1, total)).toFixed(2) + '%)');
