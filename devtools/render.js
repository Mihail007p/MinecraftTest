// Программный растеризатор: рисует сцену игры без WebGL, чтобы увидеть глазами,
// что происходит в мире (артефакты, дырки, странные пятна).
require('./harness.js');
const fs = require('fs'), zlib = require('zlib');
const D = loadGame();
const THREE = D.THREE;

const px = Number(process.argv[2] || 0), pz = Number(process.argv[3] || 0);
const yawDeg = Number(process.argv[4] || 0), pitchDeg = Number(process.argv[5] || -20);
const W = Number(process.argv[6] || 480), H = Math.round(W * 0.45);

D.player.pos.x = px; D.player.pos.z = pz;
let t = 1000; for (let i = 0; i < 120; i++) { t += 16; global.__RAF()(t); }

// камера
const cam = new THREE.PerspectiveCamera(75, W / H, 0.1, 120);
let surface = 40;
for (let y = D.CHUNK_HEIGHT - 1; y > 0; y--) { const b = D.getBlock(Math.floor(px), y, Math.floor(pz)); if (b !== 0 && b !== 8) { surface = y; break; } }
cam.position.set(px + 0.5, surface + 2.6, pz + 0.5);
cam.rotation.order = 'YXZ';
cam.rotation.y = yawDeg * Math.PI / 180;
cam.rotation.x = pitchDeg * Math.PI / 180;
cam.updateMatrixWorld(true);
cam.updateProjectionMatrix();
const viewProj = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, new THREE.Matrix4().copy(cam.matrixWorld).invert());

// текстура атласа
const atlas = D.atlasTexture.image;
const AB = atlas._buf, AW = atlas.width, AH = atlas.height;

const color = new Uint8Array(W * H * 3);
const zbuf = new Float32Array(W * H).fill(Infinity);
// небо
for (let i = 0; i < W * H; i++) { color[i * 3] = 120; color[i * 3 + 1] = 181; color[i * 3 + 2] = 232; }

D.scene.updateMatrixWorld(true);
const v = new THREE.Vector3();
let tris = 0;
function drawMesh(mesh) {
  const geo = mesh.geometry;
  if (!geo || !geo.attributes || !geo.attributes.position) return;
  const pos = geo.attributes.position.array;
  const uvA = geo.attributes.uv ? geo.attributes.uv.array : null;
  const idx = geo.index ? geo.index.array : null;
  const colA = geo.attributes.color ? geo.attributes.color.array : null;
  const colNorm = geo.attributes.color ? geo.attributes.color.normalized : false;
  const m = mesh.matrixWorld;
  const mat = mesh.material;
  const map = (mat && mat.map && mat.map.image && mat.map.image._buf) ? mat.map.image : null;
  const hasMap = !!map;
  let flat = [200, 200, 200];
  if (mat && mat.color) flat = [mat.color.r * 255, mat.color.g * 255, mat.color.b * 255];
  const n = idx ? idx.length : pos.length / 3;
  const P = [], U = [];
  for (let i = 0; i < n; i += 3) {
    const ids = idx ? [idx[i], idx[i + 1], idx[i + 2]] : [i, i + 1, i + 2];
    let ok = true;
    for (let k = 0; k < 3; k++) {
      const j = ids[k] * 3;
      v.set(pos[j], pos[j + 1], pos[j + 2]).applyMatrix4(m);
      const cx = v.x, cy = v.y, cz = v.z;
      v.applyMatrix4(viewProj);
      const wclip = v.w !== undefined ? v.w : 1;
      P[k] = { x: v.x, y: v.y, z: v.z, wx: cx, wy: cy, wz: cz };
      if (uvA) U[k] = { u: uvA[ids[k] * 2], v: uvA[ids[k] * 2 + 1] };
      else U[k] = { u: 0, v: 0 };
      U[k].s = colA ? (colNorm ? colA[ids[k] * 3] / 255 : colA[ids[k] * 3]) : 1;
    }
    // грубая проверка: за камерой -> пропускаем
    // (Vector3.applyMatrix4 уже делит на w; точки за камерой дают z>1)
    if (P.some(p => p.z < -1 || p.z > 1)) { ok = false; }
    if (!ok) continue;
    const S = P.map(p => ({ x: (p.x * 0.5 + 0.5) * W, y: (1 - (p.y * 0.5 + 0.5)) * H, z: p.z }));
    const minX = Math.max(0, Math.floor(Math.min(S[0].x, S[1].x, S[2].x)));
    const maxX = Math.min(W - 1, Math.ceil(Math.max(S[0].x, S[1].x, S[2].x)));
    const minY = Math.max(0, Math.floor(Math.min(S[0].y, S[1].y, S[2].y)));
    const maxY = Math.min(H - 1, Math.ceil(Math.max(S[0].y, S[1].y, S[2].y)));
    if (maxX < minX || maxY < minY) continue;
    const area = (S[1].x - S[0].x) * (S[2].y - S[0].y) - (S[2].x - S[0].x) * (S[1].y - S[0].y);
    if (Math.abs(area) < 1e-9) continue;
    tris++;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const cxp = x + 0.5, cyp = y + 0.5;
      const w0 = ((S[1].x - S[0].x) * (cyp - S[0].y) - (cxp - S[0].x) * (S[1].y - S[0].y)) / area;
      const w1 = ((cxp - S[0].x) * (S[2].y - S[0].y) - (S[2].x - S[0].x) * (cyp - S[0].y)) / area;
      const w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const z = S[0].z * w2 + S[1].z * w1 + S[2].z * w0;
      const o = y * W + x;
      if (z >= zbuf[o]) continue;
      let r, g, b;
      if (hasMap) {
        const uu = U[0].u * w2 + U[1].u * w1 + U[2].u * w0;
        const vv = U[0].v * w2 + U[1].v * w1 + U[2].v * w0;
        const MW = map.width, MH = map.height, MB = map._buf;
        let tx = Math.floor(uu * MW), ty = Math.floor((1 - vv) * MH);
        tx = Math.max(0, Math.min(MW - 1, tx)); ty = Math.max(0, Math.min(MH - 1, ty));
        const p = (ty * MW + tx) * 4;
        r = MB[p]; g = MB[p + 1]; b = MB[p + 2];
        if (MB[p + 3] === 0) continue;   // прозрачные пиксели декора не рисуем
        if (mat.color && !(mat.color.r === 1 && mat.color.g === 1 && mat.color.b === 1)) {
          r *= mat.color.r; g *= mat.color.g; b *= mat.color.b;
        }
      } else { r = flat[0]; g = flat[1]; b = flat[2]; }
      const sh = U[0].s * w2 + U[1].s * w1 + U[2].s * w0;
      r *= sh; g *= sh; b *= sh;
      zbuf[o] = z;
      color[o * 3] = r; color[o * 3 + 1] = g; color[o * 3 + 2] = b;
    }
  }
}
let meshes = 0;
D.scene.traverse(function (o) { if (o.isMesh) { meshes++; drawMesh(o); } });
console.log('мешей:', meshes, 'треугольников нарисовано:', tris, 'камера y=', (surface + 2.6).toFixed(1));

let tb = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; tb[n] = c >>> 0; }
const crc = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = tb[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunkP = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const tt = Buffer.from(ty); const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([tt, d]))); return Buffer.concat([l, tt, d, c]); };
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; Buffer.from(color.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1); }
const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 2;
fs.writeFileSync(__dirname + '/../_view.png', Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunkP('IHDR', ih), chunkP('IDAT', zlib.deflateSync(raw)), chunkP('IEND', Buffer.alloc(0))]));
console.log('сохранено _view.png', W + 'x' + H);
