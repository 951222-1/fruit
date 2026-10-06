import { CartoonHands } from './cartoonHands.js';

export const POSE_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,11],[6,12],[11,12],
  [11,13],[13,15],[15,17],[15,19],[15,21],[12,14],[14,16],[16,18],[16,20],[16,22],
  [11,23],[12,24],[23,24],[23,25],[25,27],[27,29],[29,31],[24,26],[26,28],[28,30],[30,32]
];

export class GameRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.particles = [];
  }

  resize(containerElement) {
    const rect = containerElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  clear(width, height) {
    this.ctx.clearRect(0, 0, width, height);
  }

  // 繪製微弱的輔助半透明骨架
  drawSkeleton(landmarks, width, height) {
    if (!landmarks) return;
    const points = landmarks.map(({ x, y, visibility = 1 }) => ({
      x: (1 - x) * width,
      y: y * height,
      visibility,
    }));

    const ctx = this.ctx;
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';

    for (const [a, b] of POSE_CONNECTIONS) {
      if (points[a].visibility < 0.4 || points[b].visibility < 0.4) continue;
      ctx.beginPath();
      ctx.moveTo(points[a].x, points[a].y);
      ctx.lineTo(points[b].x, points[b].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 頂部茂盛樹冠（橫跨整片頂部）
  drawTreeCanopy(width, _height) {
    const ctx = this.ctx;
    ctx.save();

    // 大樹幹橫木
    ctx.beginPath();
    ctx.moveTo(-20, 48);
    ctx.bezierCurveTo(width * 0.25, 35, width * 0.5, 60, width + 20, 42);
    ctx.lineWidth = 16;
    ctx.strokeStyle = '#45230c';
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width * 0.15, 45);
    ctx.bezierCurveTo(width * 0.4, 70, width * 0.65, 75, width * 0.9, 52);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#5a3014';
    ctx.stroke();

    // 茂盛綠葉團簇 (多層半透明深淺綠色)
    const leafClusters = [
      { x: width * 0.05, y: 25, r: 48, c: 'rgba(21, 128, 61, 0.88)' },
      { x: width * 0.14, y: 18, r: 56, c: 'rgba(34, 197, 94, 0.88)' },
      { x: width * 0.25, y: 32, r: 52, c: 'rgba(22, 101, 52, 0.86)' },
      { x: width * 0.38, y: 20, r: 60, c: 'rgba(34, 197, 94, 0.9)' },
      { x: width * 0.50, y: 30, r: 54, c: 'rgba(21, 128, 61, 0.88)' },
      { x: width * 0.62, y: 22, r: 58, c: 'rgba(34, 197, 94, 0.88)' },
      { x: width * 0.75, y: 32, r: 52, c: 'rgba(22, 101, 52, 0.86)' },
      { x: width * 0.88, y: 18, r: 58, c: 'rgba(34, 197, 94, 0.9)' },
      { x: width * 0.97, y: 28, r: 46, c: 'rgba(21, 128, 61, 0.88)' },
    ];

    for (const leaf of leafClusters) {
      ctx.beginPath();
      ctx.arc(leaf.x, leaf.y, leaf.r, 0, Math.PI * 2);
      ctx.fillStyle = leaf.c;
      ctx.fill();
    }

    ctx.restore();
  }

  // 繪製水果（極簡版：大顆 emoji，無外框無底圖，適合長輩辨識）
  drawFruit(fruit, isTargeted = false) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(fruit.x, fruit.y);
    ctx.rotate(fruit.rotation || 0);

    const scale = fruit.scale || 1;
    ctx.scale(scale, scale);
    const r = fruit.radius;

    // 被瞄準時輕微放大脈動提示（取代原本的光環）
    if (isTargeted) {
      ctx.scale(1.12 + Math.sin(performance.now() * 0.012) * 0.06, 1.12 + Math.sin(performance.now() * 0.012) * 0.06);
    }

    // 懸掛枝梗（細線，表示水果掛在樹上）
    if (fruit.state === 'HANGING') {
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(3, -r - 10, 0, -r - 16);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#6b4423';
      ctx.stroke();
    }

    // 水果 emoji 本體（放大、乾淨無裝飾）
    ctx.font = `${Math.round(r * 2.1)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fruit.icon, 0, r * 0.08);

    ctx.restore();
  }

  // 繪製插在左下角的立式木牌 (Staked Signpost)
  drawBottomLeftSignpost(x, y, timeLeft, score, fruitsHit) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);

    // 1. 木樁 (插在地面上的立柱)
    ctx.beginPath();
    ctx.moveTo(25, -20);
    ctx.lineTo(25, 145);
    ctx.lineTo(39, 145);
    ctx.lineTo(39, -20);
    ctx.fillStyle = '#653818';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#3d200d';
    ctx.stroke();

    // 地面青草襯托 (增添童趣自然感)
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.moveTo(12, 145);
    ctx.quadraticCurveTo(24, 125, 28, 145);
    ctx.quadraticCurveTo(36, 122, 42, 145);
    ctx.quadraticCurveTo(52, 128, 56, 145);
    ctx.fill();

    // 2. 木牌主體面板 (寬約 195，高約 110)
    const boardW = 205;
    const boardH = 118;
    const bx = 0;
    const by = -85;

    // 陰影
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;

    // 木牌底色 (溫潤咖啡色木板)
    ctx.fillStyle = '#d4a373';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(bx, by, boardW, boardH, 12) : ctx.rect(bx, by, boardW, boardH);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 木紋邊框
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#8c5324';
    ctx.stroke();

    // 內部木紋細節刻痕
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(120, 53, 15, 0.28)';
    ctx.beginPath();
    ctx.moveTo(bx + 15, by + 38); ctx.lineTo(bx + boardW - 15, by + 38);
    ctx.moveTo(bx + 15, by + 76); ctx.lineTo(bx + boardW - 15, by + 76);
    ctx.stroke();

    // 四角鉚釘
    const studs = [
      { x: bx + 12, y: by + 12 },
      { x: bx + boardW - 12, y: by + 12 },
      { x: bx + 12, y: by + boardH - 12 },
      { x: bx + boardW - 12, y: by + boardH - 12 },
    ];
    for (const st of studs) {
      ctx.beginPath();
      ctx.arc(st.x, st.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#5c3a21';
      ctx.fill();
    }

    // 3. 木牌文字資訊
    // (A) 倒數時間
    const isUrgent = timeLeft <= 10;
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    ctx.font = 'bold 20px system-ui';
    ctx.textAlign = 'left';
    ctx.fillStyle = isUrgent ? '#ef4444' : '#431407';
    if (isUrgent) {
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
    }
    ctx.fillText(`⏱️ ${timeStr}`, bx + 18, by + 28);
    ctx.shadowBlur = 0;

    // (B) 總得分
    ctx.font = 'bold 18px system-ui';
    ctx.fillStyle = '#78350f';
    ctx.fillText(`⭐ 得分: `, bx + 18, by + 64);
    ctx.fillStyle = '#b45309';
    ctx.fillText(`${score}`, bx + 95, by + 64);

    // (C) 擊落數量
    ctx.font = 'bold 18px system-ui';
    ctx.fillStyle = '#78350f';
    ctx.fillText(`🍎 擊落: `, bx + 18, by + 100);
    ctx.fillStyle = '#b45309';
    ctx.fillText(`${fruitsHit} 顆`, bx + 95, by + 100);

    ctx.restore();
  }

  // 繪製彈弓與 Q 版卡通白手套 (呼應圖二)
  drawSlingshotWithHands(baseX, baseY, pouchX, pouchY, isPulling, handsOpen = false) {
    const ctx = this.ctx;
    ctx.save();

    // 彈弓兩叉
    const forkLeft = { x: baseX - 38, y: baseY - 62 };
    const forkRight = { x: baseX + 38, y: baseY - 62 };

    // 1. 後皮筋
    ctx.beginPath();
    ctx.moveTo(forkLeft.x, forkLeft.y);
    ctx.lineTo(pouchX, pouchY);
    ctx.lineWidth = isPulling ? 5.5 : 4;
    ctx.strokeStyle = '#c2410c';
    ctx.lineCap = 'round';
    ctx.stroke();

    // 2. 木柄 Y 型叉體
    ctx.beginPath();
    ctx.moveTo(baseX, baseY + 60);
    ctx.lineTo(baseX, baseY);
    ctx.lineTo(forkLeft.x, forkLeft.y);
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(forkRight.x, forkRight.y);
    ctx.lineWidth = 15;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#6c3a17';
    ctx.stroke();

    // 木紋高光層
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#9a5525';
    ctx.stroke();

    // 金屬固定圈
    for (const pt of [forkLeft, forkRight]) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
    }

    // 3. 前皮筋
    ctx.beginPath();
    ctx.moveTo(forkRight.x, forkRight.y);
    ctx.lineTo(pouchX, pouchY);
    ctx.lineWidth = isPulling ? 5.5 : 4;
    ctx.strokeStyle = '#ea580c';
    ctx.stroke();

    // 4. 皮兜與彈丸
    ctx.beginPath();
    ctx.ellipse(pouchX, pouchY, 16, 11, isPulling ? Math.PI / 16 : 0, 0, Math.PI * 2);
    ctx.fillStyle = '#451a03';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#d97706';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pouchX, pouchY, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#f1f5f9';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#94a3b8';
    ctx.stroke();

    // 5. 雙手位置的 Q 版卡通白手套 (呼應圖二)
    const handSize = 46;
    if (isPulling) {
      if (handsOpen) {
        // 放開瞬間：繪製張開手掌 🖐️
        CartoonHands.drawOpenPalm(ctx, pouchX - 32, pouchY + 6, handSize, true);
        CartoonHands.drawOpenPalm(ctx, pouchX + 32, pouchY + 6, handSize, false);
      } else {
        // 拉弓蓄力中：繪製緊握拳頭 ✊
        CartoonHands.drawFist(ctx, pouchX - 26, pouchY + 8, handSize, true);
        CartoonHands.drawFist(ctx, pouchX + 26, pouchY + 8, handSize, false);
      }
    }

    ctx.restore();
  }

  // 繪製發光瞄準虛線與準星（含 3 秒蓄力進度環）
  drawAimingTrajectory(fromX, fromY, toX, toY, progress = 0.5, chargeRatio = 0, secLeft = 3) {
    const ctx = this.ctx;
    ctx.save();

    // 發光瞄準拋物虛線
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -performance.now() * 0.035;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2 - 25 * progress;
    ctx.quadraticCurveTo(midX, midY, toX, toY);

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#facc15';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 12;
    ctx.stroke();

    // 落點發光準星
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(toX, toY, 22 + Math.sin(performance.now() * 0.01) * 3, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#facc15';
    ctx.stroke();

    const cr = 9;
    ctx.beginPath();
    ctx.moveTo(toX - cr, toY); ctx.lineTo(toX + cr, toY);
    ctx.moveTo(toX, toY - cr); ctx.lineTo(toX, toY + cr);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#facc15';
    ctx.stroke();

    // 3 秒蓄力進度環（包圍準星，蓄滿變綠）
    if (chargeRatio > 0) {
      const ringR = 34;
      ctx.beginPath();
      ctx.arc(toX, toY, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * chargeRatio);
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.strokeStyle = chargeRatio >= 1 ? '#4ade80' : '#fb923c';
      ctx.shadowColor = chargeRatio >= 1 ? '#4ade80' : '#fb923c';
      ctx.shadowBlur = 14;
      ctx.stroke();

      // 底環
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(toX, toY, ringR, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.25)';
      ctx.stroke();

      // 倒數秒數
      if (secLeft > 0) {
        ctx.font = 'bold 15px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fb923c';
        ctx.fillText(`${secLeft}s`, toX, toY - ringR - 14);
      }
    }

    ctx.restore();
  }

  // 繪製飛行的彈丸
  drawProjectile(proj) {
    const ctx = this.ctx;
    ctx.save();

    // 飛行發光尾跡
    if (proj.trail && proj.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(proj.trail[0].x, proj.trail[0].y);
      for (let i = 1; i < proj.trail.length; i++) {
        ctx.lineTo(proj.trail[i].x, proj.trail[i].y);
      }
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.45)';
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // 彈丸
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius || 9, 0, Math.PI * 2);
    ctx.fillStyle = '#fef08a';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 14;
    ctx.fill();

    ctx.restore();
  }

  // 擊中水果產生爆裂果汁粒子
  addJuiceParticles(x, y, color = '#ef4444', count = 26) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const speed = 3.5 + Math.random() * 6.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.8,
        size: 3.5 + Math.random() * 5.0,
        color,
        alpha: 1,
        gravity: 0.22,
        decay: 0.024 + Math.random() * 0.02,
      });
    }
  }

  // 更新並渲染粒子
  renderParticles() {
    if (this.particles.length === 0) return;
    const ctx = this.ctx;
    ctx.save();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.gravity) p.vy += p.gravity;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, p.size * p.alpha), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 飄字加分動畫
  drawScorePopups(popups) {
    if (!popups || popups.length === 0) return;
    const ctx = this.ctx;
    ctx.save();
    for (let i = popups.length - 1; i >= 0; i--) {
      const pop = popups[i];
      pop.y += pop.vy;
      pop.alpha -= 0.022;

      if (pop.alpha <= 0) {
        popups.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = Math.max(0, pop.alpha);
      ctx.font = 'bold 24px system-ui';
      ctx.textAlign = 'center';
      ctx.fillStyle = pop.color || '#facc15';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 6;
      ctx.fillText(pop.text, pop.x, pop.y);
    }
    ctx.restore();
  }

  // 繪製教學小人插圖 (pose: 'up' 舉手過肩 | 'down' 併攏下拉)
  drawGuidePerson(ctx, cx, footY, h, pose) {
    const skin = '#f6d0a0';
    const hair = '#4a2f1d';
    const shirt = '#a3b47a';
    const pants = '#5b5947';
    const line = '#43301f';

    const headR = h * 0.15;
    const legH = h * 0.32;
    const bodyH = h * 0.28;
    const bodyW = h * 0.30;
    const hipY = footY - legH;
    const shoulderY = hipY - bodyH;
    const headY = shoulderY - headR - h * 0.03;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 褲管
    const legW = bodyW * 0.38;
    ctx.fillStyle = pants;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(cx - bodyW / 2 + 1, hipY - 3, legW, legH + 3, 5) : ctx.rect(cx - bodyW / 2 + 1, hipY - 3, legW, legH + 3);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(cx + bodyW / 2 - 1 - legW, hipY - 3, legW, legH + 3, 5) : ctx.rect(cx + bodyW / 2 - 1 - legW, hipY - 3, legW, legH + 3);
    ctx.fill();

    // 鞋子
    ctx.fillStyle = '#6b4f35';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(cx - bodyW / 2, footY - 6, legW + 2, 7, 3) : ctx.rect(cx - bodyW / 2, footY - 6, legW + 2, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(cx + bodyW / 2 - legW - 2, footY - 6, legW + 2, 7, 3) : ctx.rect(cx + bodyW / 2 - legW - 2, footY - 6, legW + 2, 7);
    ctx.fill();

    // 身體(衣服)
    ctx.fillStyle = shirt;
    ctx.strokeStyle = line;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(cx - bodyW / 2, shoulderY - 4, bodyW, bodyH + 9, 11) : ctx.rect(cx - bodyW / 2, shoulderY - 4, bodyW, bodyH + 9);
    ctx.fill();
    ctx.stroke();

    // 手臂與手掌（雙層線條：深色描邊 + 衣服色內芯，輪廓更清晰）
    let handY, handSpread;
    if (pose === 'up') {
      handY = headY - headR - h * 0.02;
      handSpread = bodyW * 0.42;
    } else {
      handY = hipY - bodyH * 0.55;
      handSpread = bodyW * 0.08;
    }
    const armW = Math.max(6, h * 0.07);
    const armPts = [-1, 1].map((side) => ({
      x1: cx + side * bodyW * 0.42,
      y1: shoulderY + 4,
      x2: cx + side * handSpread,
      y2: handY,
    }));

    // 外層描邊
    ctx.strokeStyle = line;
    ctx.lineWidth = armW + 4;
    for (const a of armPts) {
      ctx.beginPath();
      ctx.moveTo(a.x1, a.y1);
      ctx.lineTo(a.x2, a.y2);
      ctx.stroke();
    }
    // 內層衣服色
    ctx.strokeStyle = shirt;
    ctx.lineWidth = armW;
    for (const a of armPts) {
      ctx.beginPath();
      ctx.moveTo(a.x1, a.y1);
      ctx.lineTo(a.x2, a.y2);
      ctx.stroke();
    }

    // 手掌（描邊加粗、稍微放大）
    ctx.fillStyle = skin;
    ctx.strokeStyle = line;
    ctx.lineWidth = 2.5;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + side * handSpread, handY, Math.max(5.5, h * 0.05), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 頭
    ctx.fillStyle = skin;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, headY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 髮
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.arc(cx, headY, headR, Math.PI * 1.02, Math.PI * 1.98);
    ctx.fill();

    // 眼睛與微笑
    ctx.fillStyle = line;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + side * headR * 0.38, headY + headR * 0.05, Math.max(1.5, headR * 0.11), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = line;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx, headY + headR * 0.22, headR * 0.32, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();

    ctx.restore();
  }

  // 繪製虛線箭頭 (arrowUp: true 往上 / false 往下)
  drawDashArrow(ctx, x, y1, y2, arrowUp, color = '#7c8a4d') {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
    ctx.stroke();
    ctx.setLineDash([]);
    const dir = arrowUp ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(x - 6, y2 + dir * 9);
    ctx.lineTo(x + 6, y2 + dir * 9);
    ctx.lineTo(x, y2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 繪製小碼錶
  drawStopwatch(ctx, x, y, r) {
    ctx.save();
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2.5;
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#451a03';
    ctx.fillRect(x - 3, y - r - 6, 6, 6);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + r * 0.55, y - r * 0.35);
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + r * 0.6);
    ctx.stroke();
    ctx.restore();
  }

  // 繪製中央教學確認木牌 (校準階段)
  drawTutorialSignboard(tutorialStep, width, height, chargeInfo = null) {
    const ctx = this.ctx;
    ctx.save();

    // 幕罩微暗
    ctx.fillStyle = 'rgba(2, 6, 23, 0.65)';
    ctx.fillRect(0, 0, width, height);

    const bw = Math.min(560, width * 0.92);
    const bh = Math.min(430, height * 0.82);
    const bx = (width - bw) / 2;
    const by = (height - bh) / 2;

    // 麻繩懸掛
    ctx.beginPath();
    ctx.moveTo(bx + 40, 0); ctx.lineTo(bx + 40, by);
    ctx.moveTo(bx + bw - 40, 0); ctx.lineTo(bx + bw - 40, by);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#92400e';
    ctx.stroke();

    // 木牌底板
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#d4a373';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, 18) : ctx.rect(bx, by, bw, bh);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#78350f';
    ctx.stroke();

    // 標題
    ctx.font = 'bold 24px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#451a03';
    ctx.fillText('🏹 動作校準教學', width / 2, by + 46);

    ctx.font = '14px system-ui';
    ctx.fillStyle = '#78350f';
    ctx.fillText('請依照指示完成動作，確認攝影機正常辨識', width / 2, by + 74);

    // ===== 三欄圖卡式引導 (呼應示意圖) =====
    const cards = [
      { title: '步驟 1. 雙手併攏舉高過肩', pose: 'up', arrow: 'up' },
      { title: '步驟 2. 往下拉弓', pose: 'down', arrow: 'down' },
      { title: '步驟 3. 續力 3 秒後發射', pose: 'down', arrow: null },
    ];
    const gap = 14;
    const cardW = (bw - 48 - gap * 2) / 3;
    const cardTop = by + 92;
    const cardH = bh - 92 - 66;

    cards.forEach((card, i) => {
      const cx0 = bx + 24 + i * (cardW + gap);
      const stepNum = i + 1;
      const isActive = tutorialStep === stepNum;
      const isDone = tutorialStep > stepNum;

      // 卡片底色：當前步驟高亮黃、完成淡綠、未到白
      ctx.fillStyle = isDone ? 'rgba(190, 227, 190, 0.55)' : (isActive ? 'rgba(253, 230, 138, 0.75)' : 'rgba(255, 255, 255, 0.5)');
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(cx0, cardTop, cardW, cardH, 12) : ctx.rect(cx0, cardTop, cardW, cardH);
      ctx.fill();
      ctx.lineWidth = isActive ? 3.5 : 1.5;
      ctx.strokeStyle = isActive ? '#b45309' : (isDone ? '#4d7c4d' : 'rgba(120, 53, 15, 0.35)');
      ctx.stroke();

      // 步驟號碼徽章 (卡片左上角)
      ctx.beginPath();
      ctx.arc(cx0 + 22, cardTop + 22, 13, 0, Math.PI * 2);
      ctx.fillStyle = isDone ? '#4d7c4d' : (isActive ? '#f59e0b' : '#a8a29e');
      ctx.fill();
      ctx.font = 'bold 15px system-ui';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isDone ? '✔' : String(stepNum), cx0 + 22, cardTop + 23);

      // 卡片標題 (兩行自動斷行)
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#292524';
      ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'center';
      const titleY = cardTop + 48;
      if (card.title.length > 10) {
        const mid = card.title.lastIndexOf(' ', 12) > 0 ? card.title.lastIndexOf(' ', 12) + 1 : 10;
        ctx.fillText(card.title.slice(0, mid), cx0 + cardW / 2, titleY);
        ctx.fillText(card.title.slice(mid), cx0 + cardW / 2, titleY + 17);
      } else {
        ctx.fillText(card.title, cx0 + cardW / 2, titleY);
      }

      // 插圖區（下移避開標題，避免重疊）
      const personH = cardH - 116;
      const personFootY = cardTop + cardH - 36;
      const personCx = cx0 + cardW / 2 - 8;
      this.drawGuidePerson(ctx, personCx, personFootY, personH, card.pose);

      // 每張卡的動作箭頭/碼錶
      const ax = cx0 + cardW - 24;
      if (card.arrow === 'up') {
        this.drawDashArrow(ctx, ax, personFootY - personH * 0.5, cardTop + 82, true);
      } else if (card.arrow === 'down') {
        this.drawDashArrow(ctx, ax, cardTop + 84, personFootY - personH * 0.42, false, '#b45309');
      } else {
        this.drawStopwatch(ctx, ax + 2, cardTop + 96, 13);
        ctx.font = 'bold 12px system-ui';
        ctx.fillStyle = '#451a03';
        ctx.textAlign = 'center';
        ctx.fillText('3, 2, 1...', ax + 2, cardTop + 126);
        if (isActive && chargeInfo) {
          ctx.fillStyle = '#b45309';
          ctx.fillText(`續力中…剩 ${chargeInfo.secLeft} 秒`, cx0 + cardW / 2, personFootY + 16);
        } else {
          ctx.fillStyle = '#57534e';
          ctx.fillText('續力中…自動發射', cx0 + cardW / 2, personFootY + 16);
        }
      }

      // 步驟 1/2 的底部小字
      if (stepNum === 1) {
        ctx.font = '12px system-ui';
        ctx.fillStyle = '#57534e';
        ctx.textAlign = 'center';
        ctx.fillText('吸附皮兜', cx0 + cardW / 2, personFootY + 16);
      } else if (stepNum === 2) {
        ctx.font = '12px system-ui';
        ctx.fillStyle = '#57534e';
        ctx.textAlign = 'center';
        ctx.fillText('拉得越低射越高', cx0 + cardW / 2, personFootY + 16);
      }

      // 卡片之間的銜接箭頭
      if (i < 2) {
        ctx.save();
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        const midX = cx0 + cardW + gap / 2;
        const midY = cardTop + cardH / 2;
        ctx.moveTo(midX - 5, midY - 7);
        ctx.lineTo(midX + 6, midY);
        ctx.lineTo(midX - 5, midY + 7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    });

    // 底部按鈕提示 / 蓄力進度
    ctx.textAlign = 'center';
    if (tutorialStep === 3 && chargeInfo) {
      // 蓄力指示：進度條 + 秒數
      const barW = bw - 120;
      const barH = 14;
      const barX = bx + 60;
      const barY = by + bh - 40;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(barX, barY, barW, barH, 7) : ctx.rect(barX, barY, barW, barH);
      ctx.fill();
      ctx.fillStyle = chargeInfo.chargeRatio >= 1 ? '#22c55e' : '#f97316';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(barX, barY, Math.max(barH, barW * chargeInfo.chargeRatio), barH, 7) : ctx.rect(barX, barY, Math.max(barH, barW * chargeInfo.chargeRatio), barH);
      ctx.fill();
      ctx.font = 'bold 15px system-ui';
      ctx.fillStyle = '#451a03';
      ctx.fillText(`續力中…剩餘 ${chargeInfo.secLeft} 秒發射`, width / 2, barY - 10);
    } else {
      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 13px system-ui';
      ctx.fillText('💡 點擊下方「跳過教學」可直接開始 1 分鐘挑戰', width / 2, by + bh - 24);
    }

    ctx.restore();
  }

  // 繪製時間到結算木牌
  drawSettlementSignboard(score, fruitsHit, width, height) {
    const ctx = this.ctx;
    ctx.save();

    ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
    ctx.fillRect(0, 0, width, height);

    const bw = Math.min(480, width * 0.88);
    const bh = 320;
    const bx = (width - bw) / 2;
    const by = (height - bh) / 2;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 28;
    ctx.fillStyle = '#d4a373';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, 20) : ctx.rect(bx, by, bw, bh);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#78350f';
    ctx.stroke();

    ctx.font = 'bold 26px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#451a03';
    ctx.fillText('⏰ 時間到！挑戰結算', width / 2, by + 50);

    // 成績展示卡
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(bx + 30, by + 80, bw - 60, 140, 14) : ctx.rect(bx + 30, by + 80, bw - 60, 140);
    ctx.fill();

    ctx.font = 'bold 36px system-ui';
    ctx.fillStyle = '#b45309';
    ctx.fillText(`${score} 分`, width / 2, by + 128);

    ctx.font = '16px system-ui';
    ctx.fillStyle = '#78350f';
    ctx.fillText(`成功擊落 ${fruitsHit} 顆水果 🍎`, width / 2, by + 162);

    // 評級
    let rank = '🌟 果園新手';
    if (score >= 120) rank = '👑 傳奇神射手！';
    else if (score >= 70) rank = '🌟🌟🌟 摘果高手！';
    else if (score >= 30) rank = '🌟🌟 神準射手';

    ctx.font = 'bold 20px system-ui';
    ctx.fillStyle = '#16a34a';
    ctx.fillText(rank, width / 2, by + 198);

    ctx.font = 'bold 15px system-ui';
    ctx.fillStyle = '#451a03';
    ctx.fillText('👉 請點擊下方「再玩一局 🔄」重新開始挑戰！', width / 2, by + bh - 24);

    ctx.restore();
  }
}
