require('./harness.js');
const t0 = Date.now();
const D = loadGame();
const boot = Date.now() - t0;
let t = 1000, errs = 0;
for (let i = 0; i < 60; i++) { t += 16; try { global.__RAF()(t); } catch (e) { errs++; console.log('FRAME ERR', e.message); break; } }
const list = [...D.chunks.values()];
const t1 = Date.now(); for (const c of list) D.rebuildChunkMesh(c); const meshMs = Date.now() - t1;
let verts = 0, tris = 0, sum = 0, withColor = 0, meshes = 0;
for (const c of list) for (const m of [c.solidMesh, c.waterMesh, c.glassMesh]) {
  if (!m) continue; meshes++;
  const pos = m.geometry.attributes.position.array;
  verts += pos.length / 3; tris += m.geometry.index.count / 3;
  for (let i = 0; i < pos.length; i++) sum += pos[i];
  if (m.geometry.attributes.color) {
    withColor++;
    if (m.geometry.attributes.color.array.length !== pos.length) console.log('!! длина цвета не совпадает');
  }
}
console.log(JSON.stringify({bootMs: boot, meshMs, chunks: list.length, meshes, withColor, verts, tris, sum: Math.round(sum), errs,
  atlas: D.atlasTexture.image.width + 'x' + D.atlasTexture.image.height, pxr: D.PERF.pixelRatio}));
