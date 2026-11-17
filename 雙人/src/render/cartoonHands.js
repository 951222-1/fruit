/**
 * Q 版向量卡通手套繪製 (純 Canvas 貝茲曲線，零圖檔依賴)
 * 支援 P1 (藍色邊飾) 與 P2 (橘色邊飾)
 */

export function drawFist(ctx, x, y, size = 32, theme = 'blue') {
  ctx.save();
  ctx.translate(x, y);

  const mainColor = '#ffffff';
  const strokeColor = theme === 'orange' ? '#c2410c' : '#1d4ed8';
  const cuffColor = theme === 'orange' ? '#f97316' : '#3b82f6';

  // 1. 手腕袖口
  ctx.fillStyle = cuffColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-size * 0.45, size * 0.35, size * 0.9, size * 0.35, size * 0.12);
  ctx.fill();
  ctx.stroke();

  // 2. 拳頭主體 (白肉球)
  ctx.fillStyle = mainColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.65, size * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 3. 四指指節弧線
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(-size * 0.22, -size * 0.05, size * 0.16, 0.2, Math.PI - 0.2);
  ctx.arc(0, -size * 0.08, size * 0.16, 0.2, Math.PI - 0.2);
  ctx.arc(size * 0.22, -size * 0.05, size * 0.16, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // 4. 大拇指
  ctx.fillStyle = mainColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(-size * 0.28, size * 0.15, size * 0.26, size * 0.18, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 腮紅
  ctx.fillStyle = theme === 'orange' ? 'rgba(251, 146, 60, 0.35)' : 'rgba(96, 165, 250, 0.35)';
  ctx.beginPath();
  ctx.arc(size * 0.18, size * 0.1, size * 0.14, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawOpenPalm(ctx, x, y, size = 32, theme = 'blue') {
  ctx.save();
  ctx.translate(x, y);

  const mainColor = '#ffffff';
  const strokeColor = theme === 'orange' ? '#c2410c' : '#1d4ed8';
  const cuffColor = theme === 'orange' ? '#f97316' : '#3b82f6';

  // 1. 袖口
  ctx.fillStyle = cuffColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-size * 0.45, size * 0.45, size * 0.9, size * 0.35, size * 0.12);
  ctx.fill();
  ctx.stroke();

  // 2. 掌心
  ctx.fillStyle = mainColor;
  ctx.beginPath();
  ctx.ellipse(0, size * 0.15, size * 0.52, size * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 3. 張開的五指
  const fingerOffsets = [
    { x: -size * 0.46, y: size * 0.05, w: size * 0.18, h: size * 0.32, angle: -0.65 }, // 拇指
    { x: -size * 0.26, y: -size * 0.36, w: size * 0.15, h: size * 0.44, angle: -0.22 }, // 食指
    { x: 0, y: -size * 0.44, w: size * 0.16, h: size * 0.48, angle: 0 },              // 中指
    { x: size * 0.26, y: -size * 0.36, w: size * 0.15, h: size * 0.44, angle: 0.22 },  // 無名指
    { x: size * 0.44, y: -size * 0.2, w: size * 0.14, h: size * 0.36, angle: 0.45 },   // 小指
  ];

  for (const f of fingerOffsets) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, f.w, f.h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 掌心肉墊
  ctx.fillStyle = theme === 'orange' ? 'rgba(251, 146, 60, 0.35)' : 'rgba(96, 165, 250, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, size * 0.18, size * 0.26, size * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
