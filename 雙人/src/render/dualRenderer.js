import { drawFist, drawOpenPalm } from './cartoonHands.js';

const ART_BASE_URL = `${import.meta.env.BASE_URL}art/`;

export class DualRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.assets = {};
    this.assetsReady = this.loadAssets();
  }

  async loadAssets() {
    const assetList = [
      { key: 'background', url: `${ART_BASE_URL}orchard-background-muted.jpg` },
      { key: 'frame', url: `${ART_BASE_URL}orchard-frame-muted.png` },
      { key: 'evil-bird', url: `${ART_BASE_URL}evil-bird.png` },
      { key: 'hands-fist', url: `${ART_BASE_URL}hands-fist.png` },
      { key: 'slingshot-fork', url: `${ART_BASE_URL}slingshot-fork.png` },
      { key: 'slingshot-idle', url: `${ART_BASE_URL}slingshot-idle.png` },
      { key: 'slingshot-pouch', url: `${ART_BASE_URL}slingshot-pouch.png` },
      { key: 'slingshot-pulled', url: `${ART_BASE_URL}slingshot-pulled.png` },
      { key: 'fruit-red-apple', url: `${ART_BASE_URL}fruit-red-apple.png` },
      { key: 'fruit-orange', url: `${ART_BASE_URL}fruit-orange.png` },
      { key: 'fruit-peach', url: `${ART_BASE_URL}fruit-peach.png` },
      { key: 'fruit-lemon', url: `${ART_BASE_URL}fruit-lemon.png` },
      { key: 'fruit-green-apple', url: `${ART_BASE_URL}fruit-green-apple.png` },
    ];

    const promises = assetList.map(({ key, url }) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          this.assets[key] = img;
          resolve();
        };
        img.onerror = () => {
          console.warn(`無法載入素材 ${key} (${url})，將使用 fallback 自繪`);
          resolve();
        };
      });
    });

    await Promise.all(promises);
  }

  resize(stage) {
    const dpr = window.devicePixelRatio || 1;
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);
  }

  clear(width, height) {
    this.ctx.clearRect(0, 0, width, height);
  }

  render(game, timestamp) {
    const ctx = this.ctx;
    const w = game.stageWidth;
    const h = game.stageHeight;

    this.clear(w, h);

    // 1. 果園背景與中間分界區域
    this.drawBackground(w, h);

    // 2. 邪惡壞鳥 Boss
    this.drawBoss(game.boss, timestamp);

    // 3. 頂部 Boss 巨型血條
    this.drawBossHpBar(game.boss, w, timestamp, game.comboBannerUntil);

    // 4. 雙人彈弓與瞄準線
    this.drawPlayerSlingshot(game.p1, timestamp);
    this.drawPlayerSlingshot(game.p2, timestamp);

    // 5. 飛行的水果彈丸
    this.drawProjectiles(game.projectiles);

    // 6. 特效 (衝擊波、粒子、飄字)
    this.drawEffects(game.shockwaves, game.particles, game.popups);

    // 7. 雙人合體技大橫幅
    if (timestamp < game.comboBannerUntil) {
      this.drawComboBanner(w, timestamp);
    }

    // 8. 結算畫面
    if (game.phase === 'FINISHED') {
      this.drawFinishedModal(game, w, h);
    }
  }

  drawBackground(w, h) {
    const ctx = this.ctx;
    const bg = this.assets['background'];
    if (bg && bg.complete && bg.naturalWidth > 0) {
      ctx.drawImage(bg, 0, 0, w, h);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0f2b46');
      grad.addColorStop(1, '#061524');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // 鏡頭中央分界指引 (淡色金屬發光虛線)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.14);
    ctx.lineTo(w * 0.5, h);
    ctx.stroke();

    // 底部 P1 / P2 區域標籤 (高對比醒目提示)
    ctx.setLineDash([]);
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';

    // P1 標籤
    ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
    ctx.beginPath();
    ctx.roundRect(w * 0.26 - 75, h - 34, 150, 26, 13);
    ctx.fill();
    ctx.fillStyle = '#93c5fd';
    ctx.fillText('👤 玩家 1 (左側藍隊)', w * 0.26, h - 16);

    // P2 標籤
    ctx.fillStyle = 'rgba(249, 115, 22, 0.25)';
    ctx.beginPath();
    ctx.roundRect(w * 0.74 - 75, h - 34, 150, 26, 13);
    ctx.fill();
    ctx.fillStyle = '#fed7aa';
    ctx.fillText('👤 玩家 2 (右側橘隊)', w * 0.74, h - 16);

    ctx.restore();
  }

  drawBoss(boss, timestamp) {
    const ctx = this.ctx;
    const img = this.assets['evil-bird'];

    ctx.save();
    const breathY = Math.sin(timestamp * 0.0035) * 6;
    const drawX = boss.x + boss.shakeX;
    const drawY = boss.y + boss.shakeY + breathY;

    ctx.translate(drawX, drawY);

    if (boss.defeated) {
      // 擊破旋轉縮小眼冒金星
      const p = boss.defeatProgress;
      ctx.rotate(p * 6);
      ctx.scale(Math.max(0, 1 - p * 0.8), Math.max(0, 1 - p * 0.8));
      ctx.globalAlpha = Math.max(0, 1 - p);
    }

    const isFlashingRed = timestamp < boss.flashRedUntil;

    // 繪製邪惡壞鳥
    if (img && img.complete && img.naturalWidth > 0) {
      const targetW = boss.width;
      const targetH = (img.naturalHeight / img.naturalWidth) * targetW;

      ctx.save();
      // 受擊閃紅濾鏡
      if (isFlashingRed) {
        ctx.filter = 'drop-shadow(0 0 18px #ef4444) brightness(1.3) sepia(1) saturate(5) hue-rotate(-50deg)';
      } else {
        ctx.filter = 'drop-shadow(0 10px 24px rgba(0, 0, 0, 0.6))';
      }

      ctx.drawImage(img, -targetW * 0.5, -targetH * 0.5, targetW, targetH);
      ctx.restore();
    } else {
      // Fallback 自繪壞鳥
      ctx.fillStyle = isFlashingRed ? '#ef4444' : '#451a03';
      ctx.beginPath();
      ctx.ellipse(0, 0, 100, 75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#facc15';
      ctx.stroke();

      // 壞鳥眼睛
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(-30, -20, 16, 0, Math.PI * 2);
      ctx.arc(30, -20, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    // 壞鳥銳利眼神微光動畫 (非受擊時)
    if (!isFlashingRed && !boss.defeated) {
      const eyeGlow = 0.5 + Math.sin(timestamp * 0.006) * 0.4;
      ctx.fillStyle = `rgba(239, 68, 68, ${eyeGlow * 0.6})`;
      ctx.beginPath();
      ctx.arc(-24, -14, 18, 0, Math.PI * 2);
      ctx.arc(24, -14, 18, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawBossHpBar(boss, width, timestamp, comboBannerUntil) {
    const ctx = this.ctx;
    const barW = Math.min(680, width * 0.72);
    const barH = 34;
    const x = (width - barW) * 0.5;
    const y = 20;

    ctx.save();

    // 1. 底框陰影與木質邊框
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#1c1917';
    ctx.strokeStyle = timestamp < comboBannerUntil ? '#facc15' : '#78350f';
    ctx.lineWidth = timestamp < comboBannerUntil ? 4.5 : 3.5;

    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, 18);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 2. 吃痛延遲白條 (Delayed Damage Bar)
    const delayedRatio = Math.max(0, Math.min(1, boss.displayHp / boss.maxHp));
    if (delayedRatio > 0) {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.roundRect(x + 3, y + 3, (barW - 6) * delayedRatio, barH - 6, 15);
      ctx.fill();
    }

    // 3. 當前主血條
    const currentRatio = Math.max(0, Math.min(1, boss.hp / boss.maxHp));
    if (currentRatio > 0) {
      let hpGrad = ctx.createLinearGradient(x, 0, x + barW, 0);
      if (currentRatio > 0.5) {
        hpGrad.addColorStop(0, '#22c55e');
        hpGrad.addColorStop(1, '#84cc16');
      } else if (currentRatio > 0.25) {
        hpGrad.addColorStop(0, '#f97316');
        hpGrad.addColorStop(1, '#eab308');
      } else {
        hpGrad.addColorStop(0, '#ef4444');
        hpGrad.addColorStop(1, '#dc2626');
      }

      ctx.fillStyle = hpGrad;
      ctx.beginPath();
      ctx.roundRect(x + 3, y + 3, (barW - 6) * currentRatio, barH - 6, 15);
      ctx.fill();
    }

    // 4. 血條標題與血量數字
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText('🦅 邪惡壞鳥 (BOSS)', x + 16, y + 23);

    ctx.textAlign = 'right';
    const percent = Math.round(currentRatio * 100);
    ctx.fillText(`${boss.hp} / ${boss.maxHp} (${percent}%)`, x + barW - 16, y + 23);

    ctx.restore();
  }

  drawPlayerSlingshot(player, timestamp) {
    const ctx = this.ctx;
    const isP1 = player.id === 'p1';
    const theme = player.theme;
    const mainColor = isP1 ? '#3b82f6' : '#f97316';
    const lightColor = isP1 ? '#93c5fd' : '#fed7aa';

    const forkImg = this.assets['slingshot-fork'];
    const idleImg = this.assets['slingshot-idle'];
    const pouchImg = this.assets['slingshot-pouch'];
    const handsFistImg = this.assets['hands-fist'];

    ctx.save();

    // 彈弓木架尺寸 (高對比高品質貼圖)
    const forkW = Math.min(130, this.stageWidth * 0.13);
    const forkH = forkW * (1288 / 895);
    const anchorX = player.anchor.x;
    const anchorY = player.anchor.y;

    // 左右叉梢端點
    const armTopY = anchorY - forkH * 0.36;
    const prongLX = anchorX - forkW * 0.36;
    const prongRX = anchorX + forkW * 0.36;

    const pouchX = player.pouch.x;
    const pouchY = player.pouch.y;

    // 1. 繪製彈弓本體與橡皮筋
    if (player.state === 'PULLING') {
      // 拉弓中：繪製真實彈弓木架
      if (forkImg && forkImg.complete && forkImg.naturalWidth > 0) {
        ctx.save();
        ctx.shadowColor = isP1 ? 'rgba(59, 130, 246, 0.45)' : 'rgba(249, 115, 22, 0.45)';
        ctx.shadowBlur = 12;
        ctx.drawImage(forkImg, anchorX - forkW * 0.5, anchorY - forkH * 0.52, forkW, forkH);
        ctx.restore();
      } else {
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(anchorX, anchorY + 40);
        ctx.lineTo(anchorX, anchorY);
        ctx.lineTo(prongLX, armTopY);
        ctx.moveTo(anchorX, anchorY);
        ctx.lineTo(prongRX, armTopY);
        ctx.stroke();
      }

      // 繪製拉伸的橡皮筋 (外層深色 + 內層亮色光澤)
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = theme === 'orange' ? '#c2410c' : '#1d4ed8';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(prongLX, armTopY);
      ctx.lineTo(pouchX, pouchY);
      ctx.moveTo(prongRX, armTopY);
      ctx.lineTo(pouchX, pouchY);
      ctx.stroke();

      ctx.strokeStyle = theme === 'orange' ? '#fb923c' : '#60a5fa';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(prongLX, armTopY);
      ctx.lineTo(pouchX, pouchY);
      ctx.moveTo(prongRX, armTopY);
      ctx.lineTo(pouchX, pouchY);
      ctx.stroke();
      ctx.restore();

      // 瞄準虛線與準星
      ctx.strokeStyle = lightColor;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(pouchX, pouchY);
      ctx.lineTo(player.target.x, player.target.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const tx = player.target.x;
      const ty = player.target.y;
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(tx, ty, 22, 0, Math.PI * 2);
      ctx.moveTo(tx - 28, ty);
      ctx.lineTo(tx + 28, ty);
      ctx.moveTo(tx, ty - 28);
      ctx.lineTo(tx + 28, ty);
      ctx.stroke();

      // 3 秒蓄力進度外圈
      const chargeRatio = Math.min(1, player.chargeMs / 3000);
      const chargeAngle = chargeRatio * Math.PI * 2;
      ctx.strokeStyle = chargeRatio >= 0.95 ? '#4ade80' : '#facc15';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(tx, ty, 30, -Math.PI / 2, -Math.PI / 2 + chargeAngle);
      ctx.stroke();

      const secLeft = Math.ceil((3000 - player.chargeMs) / 1000);
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText(secLeft + 's', tx, ty - 36);

      // 皮兜 (slingshot-pouch.png)
      if (pouchImg && pouchImg.complete && pouchImg.naturalWidth > 0) {
        const pW = 46;
        const pH = pW * (pouchImg.naturalHeight / pouchImg.naturalWidth);
        ctx.save();
        ctx.drawImage(pouchImg, pouchX - pW * 0.5, pouchY - pH * 0.5, pW, pH);
        ctx.restore();
      }

      // 手部 (hands-fist.png) 緊握皮兜拉弓
      if (handsFistImg && handsFistImg.complete && handsFistImg.naturalWidth > 0) {
        const hW = Math.min(130, this.stageWidth * 0.13);
        const hH = hW * (handsFistImg.naturalHeight / handsFistImg.naturalWidth);
        ctx.save();
        ctx.shadowColor = isP1 ? 'rgba(59, 130, 246, 0.75)' : 'rgba(249, 115, 22, 0.75)';
        ctx.shadowBlur = 14;
        ctx.drawImage(handsFistImg, pouchX - hW * 0.5, pouchY - hH * 0.5, hW, hH);
        ctx.restore();
      } else {
        drawFist(ctx, pouchX, pouchY, 34, theme);
      }
    } else {
      // 靜止 / 準備狀態：繪製整套彈弓 (slingshot-idle.png 或 fork + 自然皮筋)
      if (idleImg && idleImg.complete && idleImg.naturalWidth > 0) {
        ctx.save();
        ctx.shadowColor = isP1 ? 'rgba(59, 130, 246, 0.35)' : 'rgba(249, 115, 22, 0.35)';
        ctx.shadowBlur = 10;
        ctx.drawImage(idleImg, anchorX - forkW * 0.5, anchorY - forkH * 0.52, forkW, forkH);
        ctx.restore();
      } else if (forkImg && forkImg.complete && forkImg.naturalWidth > 0) {
        ctx.drawImage(forkImg, anchorX - forkW * 0.5, anchorY - forkH * 0.52, forkW, forkH);
        ctx.strokeStyle = theme === 'orange' ? '#ea580c' : '#2563eb';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(prongLX, armTopY);
        ctx.quadraticCurveTo(anchorX, armTopY + 25, prongRX, armTopY);
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(anchorX, anchorY + 40);
        ctx.lineTo(anchorX, anchorY);
        ctx.lineTo(prongLX, armTopY);
        ctx.moveTo(anchorX, anchorY);
        ctx.lineTo(prongRX, armTopY);
        ctx.stroke();
      }

      // 準備狀態 (READY) 或 IDLE 時的手部提示
      if (player.state === 'READY') {
        if (handsFistImg && handsFistImg.complete && handsFistImg.naturalWidth > 0) {
          const hW = Math.min(118, this.stageWidth * 0.12);
          const hH = hW * (handsFistImg.naturalHeight / handsFistImg.naturalWidth);
          ctx.save();
          const bounce = Math.sin(timestamp * 0.008) * 5;
          ctx.shadowColor = isP1 ? 'rgba(59, 130, 246, 0.85)' : 'rgba(249, 115, 22, 0.85)';
          ctx.shadowBlur = 16;
          ctx.drawImage(handsFistImg, pouchX - hW * 0.5, pouchY - hH * 0.5 + bounce, hW, hH);
          ctx.restore();
        } else {
          drawFist(ctx, pouchX, pouchY, 32, theme);
        }
      } else {
        // IDLE 狀態：在彈弓上方顯示浮動手勢引導
        ctx.save();
        const floatY = Math.sin(timestamp * 0.005) * 4;
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = isP1 ? '#93c5fd' : '#fed7aa';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText('✋ 舉手過肩吸附', anchorX, anchorY - forkH * 0.58 + floatY);
        ctx.restore();
      }
    }

    ctx.restore();
  }
  drawProjectiles(projectiles) {
    const ctx = this.ctx;
    for (const p of projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      const fruitImg = this.assets[p.fruit.assetKey];
      if (fruitImg && fruitImg.complete && fruitImg.naturalWidth > 0) {
        ctx.drawImage(fruitImg, -p.radius, -p.radius, p.radius * 2, p.radius * 2);
      } else {
        ctx.fillStyle = p.fruit.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  drawEffects(shockwaves, particles, popups) {
    const ctx = this.ctx;

    // 衝擊波
    for (const s of shockwaves) {
      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 8 * s.life;
      ctx.globalAlpha = s.life;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 粒子
    for (const p of particles) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 飄字
    for (const popup of popups) {
      ctx.save();
      ctx.font = `bold ${Math.round(28 * popup.scale)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = popup.color;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 8;
      ctx.globalAlpha = popup.life;
      ctx.fillText(popup.text, popup.x, popup.y);
      ctx.restore();
    }
  }

  drawComboBanner(width, timestamp) {
    const ctx = this.ctx;
    const bannerW = Math.min(520, width * 0.7);
    const x = (width - bannerW) * 0.5;
    const y = 80;

    ctx.save();
    const grad = ctx.createLinearGradient(x, 0, x + bannerW, 0);
    grad.addColorStop(0, 'rgba(234, 88, 12, 0.92)');
    grad.addColorStop(0.5, 'rgba(250, 204, 21, 0.95)');
    grad.addColorStop(1, 'rgba(234, 88, 12, 0.92)');

    ctx.fillStyle = grad;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, y, bannerW, 46, 23);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText('✨ 雙人合體大爆擊！+130 額外傷害！💥', width * 0.5, y + 31);
    ctx.restore();
  }

  drawFinishedModal(game, w, h) {
    const ctx = this.ctx;
    const isVictory = game.result === 'VICTORY';
    const cardW = Math.min(540, w * 0.85);
    const cardH = 340;
    const x = (w - cardW) * 0.5;
    const y = (h - cardH) * 0.5;

    ctx.save();
    // 半透明遮罩
    ctx.fillStyle = 'rgba(3, 7, 18, 0.75)';
    ctx.fillRect(0, 0, w, h);

    // 木牌底框
    ctx.fillStyle = '#fffbeb';
    ctx.strokeStyle = isVictory ? '#facc15' : '#8c5324';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 24);
    ctx.fill();
    ctx.stroke();

    // 標題
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillStyle = isVictory ? '#b45309' : '#991b1b';
    ctx.fillText(isVictory ? '👑 討伐大成功！神射手拍檔！' : '⏰ 時間到！差一點就擊倒巨怪！', w * 0.5, y + 54);

    // 數據統計
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = '#292524';
    const spentSec = 90 - game.timeLeft;
    ctx.fillText(`⏱️ 討伐耗時：${spentSec} 秒`, w * 0.5, y + 105);
    ctx.fillText(`💥 雙人合體技：共觸發 ${game.totalCombos} 次！`, w * 0.5, y + 140);

    // P1 與 P2 戰績比較
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = '#1d4ed8';
    ctx.fillText(`👤 玩家 1 (藍隊)：命中 ${game.p1.hits} 發 · 造成 ${game.p1.totalDamage} 傷害`, w * 0.5, y + 185);

    ctx.fillStyle = '#c2410c';
    ctx.fillText(`👤 玩家 2 (橘隊)：命中 ${game.p2.hits} 發 · 造成 ${game.p2.totalDamage} 傷害`, w * 0.5, y + 218);

    // 溫馨提示
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = '#78716c';
    ctx.fillText('點選下方按鈕即可重新挑戰或返回單人模式', w * 0.5, y + 270);

    ctx.restore();
  }
}
