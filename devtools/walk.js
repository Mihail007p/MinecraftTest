// Симуляция ходьбы: меряем «дрожание» камеры (вторая производная высоты).
require('./harness.js');
const D = loadGame();
let t = 1000;
for (let i = 0; i < 90; i++) { t += 16; global.__RAF()(t); }
D.moveInput.x = 0; D.moveInput.y = 1;      // идём вперёд
D.player.yaw = 0.6;
const ys = [];
const frames = 600;
for (let i = 0; i < frames; i++) {
  // неровные кадры, как на телефоне: 16/22/33 мс
  t += [16, 17, 22, 16, 33, 18][i % 6];
  global.__RAF()(t);
  ys.push(D.camera.position.y);
}
let jerk = 0, jumps = 0;
for (let i = 2; i < ys.length; i++) {
  const a = (ys[i] - ys[i - 1]) - (ys[i - 1] - ys[i - 2]);
  jerk += Math.abs(a);
  if (Math.abs(ys[i] - ys[i - 1]) > 0.12) jumps++;
}
console.log(JSON.stringify({
  кадров: frames,
  путь: (Math.round((D.player.pos.x * D.player.pos.x + D.player.pos.z * D.player.pos.z) ** 0.5)),
  дрожание: +(jerk / frames).toFixed(4),
  резкихСкачков: jumps,
  минY: +Math.min(...ys).toFixed(2), максY: +Math.max(...ys).toFixed(2)
}));
