import { dualSound } from '../services/audio.js';

const CHARGE_REQUIRED_MS = 3000;
const HAND_LOSS_GRACE_MS = 2000;
const COMBO_WINDOW_MS = 1600; // 1.6 秒內相繼命中觸發合體大爆擊

const FRUIT_PELLETS = [
  { id: 'red-apple', name: '紅蘋果', assetKey: 'fruit-red-apple.png', color: '#ef4444' },
  { id: 'orange', name: '甜橙', assetKey: 'fruit-orange.png', color: '#f97316' },
  { id: 'peach', name: '水蜜桃', assetKey: 'fruit-peach.png', color: '#f472b6' },
  { id: 'lemon', name: '黃檸檬', assetKey: 'fruit-lemon.png', color: '#eab308' },
  { id: 'green-apple', name: '青蘋果', assetKey: 'fruit-green-apple.png', color: '#84cc16' },
];

export class DualBossGame {
  constructor() {
    this.phase = 'PLAYING'; // 'PLAYING' | 'FINISHED'
    this.result = null; // 'VICTORY' | 'DEFEAT'
    this.timeLeft = 90;
    this.lastTickTime = 0;
    this.lastUpdateTime = 0;
    this.stageWidth = 1280;
    this.stageHeight = 720;

    // 邪惡壞鳥 Boss
    this.boss = {
      name: '邪惡壞鳥',
      maxHp: 1000,
      hp: 1000,
      displayHp: 1000,
      x: 0,
      y: 0,
      width: 280,
      height: 180,
      hitRadius: 130,
      shakeX: 0,
      shakeY: 0,
      shakeUntil: 0,
      flashRedUntil: 0,
      defeated: false,
      defeatProgress: 0,
    };

    // 兩位玩家
    this.p1 = this.createPlayerState('p1', '玩家 1 (左側)', '#3b82f6', 'blue');
    this.p2 = this.createPlayerState('p2', '玩家 2 (右側)', '#f97316', 'orange');

    // 彈丸、特效與飄字
    this.projectiles = [];
    this.popups = [];
    this.particles = [];
    this.shockwaves = [];

    // 合體技狀態
    this.lastP1HitAt = -99999;
    this.lastP2HitAt = -99999;
    this.totalCombos = 0;
    this.comboBannerUntil = 0;
  }

  createPlayerState(id, name, color, theme) {
    return {
      id,
      name,
      color,
      theme,
      state: 'IDLE', // 'IDLE' | 'READY' | 'PULLING'
      chargeMs: 0,
      lastChargeSecond: 0,
      handsOpen: false,
      anchor: { x: 0, y: 0 },
      pouch: { x: 0, y: 0 },
      target: { x: 0, y: 0 },
      pullProgress: 0,
      smoothMidX: null,
      smoothMidY: null,
      smoothDist: null,
      shoulderYSmooth: null,
      shoulderSeenAt: 0,
      handsSeenAt: 0,
      lastHandsData: null,
      togetherStreak: 0,
      pullStreak: 0,
      outZoneAt: 0,
      hits: 0,
      totalDamage: 0,
      nextFruitIndex: Math.floor(Math.random() * FRUIT_PELLETS.length),
    };
  }

  init(width, height) {
    this.resize(width, height);
    this.restart();
  }

  resize(width, height) {
    this.stageWidth = Math.max(320, width);
    this.stageHeight = Math.max(240, height);

    this.boss.x = this.stageWidth * 0.5;
    this.boss.y = this.stageHeight * 0.28;
    this.boss.hitRadius = Math.min(140, this.stageWidth * 0.16);

    // 彈弓基準點：P1 左側 26%，P2 右側 74%
    this.p1.anchor = { x: this.stageWidth * 0.26, y: this.stageHeight * 0.88 };
    this.p1.pouch = { ...this.p1.anchor };
    this.p1.target = { x: this.boss.x - 40, y: this.boss.y };

    this.p2.anchor = { x: this.stageWidth * 0.74, y: this.stageHeight * 0.88 };
    this.p2.pouch = { ...this.p2.anchor };
    this.p2.target = { x: this.boss.x + 40, y: this.boss.y };
  }

  restart() {
    this.phase = 'PLAYING';
    this.result = null;
    this.timeLeft = 90;
    this.lastTickTime = performance.now();
    this.lastUpdateTime = performance.now();

    this.boss.hp = this.boss.maxHp;
    this.boss.displayHp = this.boss.maxHp;
    this.boss.defeated = false;
    this.boss.defeatProgress = 0;
    this.boss.shakeUntil = 0;
    this.boss.flashRedUntil = 0;

    this.resetPlayer(this.p1);
    this.resetPlayer(this.p2);

    this.projectiles = [];
    this.popups = [];
    this.particles = [];
    this.shockwaves = [];
    this.lastP1HitAt = -99999;
    this.lastP2HitAt = -99999;
    this.totalCombos = 0;
    this.comboBannerUntil = 0;
  }

  resetPlayer(player) {
    player.state = 'IDLE';
    player.chargeMs = 0;
    player.lastChargeSecond = 0;
    player.hits = 0;
    player.totalDamage = 0;
    player.smoothMidX = null;
    player.smoothMidY = null;
    player.smoothDist = null;
    player.shoulderYSmooth = null;
    player.lastHandsData = null;
    player.togetherStreak = 0;
    player.pullStreak = 0;
    player.pouch = { ...player.anchor };
  }

  update(detectionData) {
    const now = performance.now();
    const dt = this.lastUpdateTime > 0 ? Math.min(100, now - this.lastUpdateTime) : 16;
    this.lastUpdateTime = now;

    // 平滑遞減 Boss 顯示血條
    if (this.boss.displayHp > this.boss.hp) {
      this.boss.displayHp = Math.max(this.boss.hp, this.boss.displayHp - dt * 0.35);
    }

    if (this.phase === 'PLAYING') {
      // 90 秒倒數計時
      if (now - this.lastTickTime >= 1000) {
        this.timeLeft = Math.max(0, this.timeLeft - 1);
        this.lastTickTime = now;
        if (this.timeLeft <= 0) {
          this.endGame(false);
        }
      }

      // 分配雙人姿態與雙手
      const { p1Pose, p2Pose, p1Hands, p2Hands } = this.assignDetections(detectionData);

      // 更新兩位玩家的彈弓拉弓與蓄力
      this.updatePlayerGesture(this.p1, p1Pose, p1Hands, now, dt);
      this.updatePlayerGesture(this.p2, p2Pose, p2Hands, now, dt);

      // 更新彈丸與 Boss 碰撞判定
      this.updateProjectiles(now);
    } else if (this.boss.defeated) {
      this.boss.defeatProgress = Math.min(1, this.boss.defeatProgress + dt * 0.001);
    }

    // 更新特效與飄字
    this.updateEffects(dt, now);
  }

  /**
   * 智慧分配偵測點至 P1 (左) 與 P2 (右)
   */
  assignDetections(detectionData) {
    const halfWidth = this.stageWidth * 0.5;
    const poses = detectionData?.poseResult?.landmarks || [];
    const hands = detectionData?.handResult?.landmarks || [];

    let p1Pose = null;
    let p2Pose = null;

    // 分配 Pose (根據鼻子或肩膀 X 座標)
    for (const pose of poses) {
      if (!pose || !pose[0]) continue;
      const refX = pose[0].x * this.stageWidth; // 鏡頭已鏡像反轉，因此以實際 stage 像素計算
      if (refX < halfWidth) {
        if (!p1Pose || (pose[0].visibility || 0) > (p1Pose[0].visibility || 0)) p1Pose = pose;
      } else {
        if (!p2Pose || (pose[0].visibility || 0) > (p2Pose[0].visibility || 0)) p2Pose = pose;
      }
    }

    const p1Hands = [];
    const p2Hands = [];

    // 分配 Hands (根據掌心/腕部 X 座標)
    for (const hand of hands) {
      if (!hand || !hand[0]) continue;
      const wristX = hand[0].x * this.stageWidth;
      if (wristX < halfWidth) {
        p1Hands.push(hand);
      } else {
        p2Hands.push(hand);
      }
    }

    return { p1Pose, p2Pose, p1Hands, p2Hands };
  }

  updatePlayerGesture(player, poseLandmarks, handLandmarks, now, dt) {
    const isP1 = player.id === 'p1';
    const fallbackX = isP1 ? this.stageWidth * 0.26 : this.stageWidth * 0.74;

    // 1. 取得肩膀高度基準
    let shoulderY = null;
    if (poseLandmarks && poseLandmarks[11] && poseLandmarks[12]) {
      const leftS = poseLandmarks[11];
      const rightS = poseLandmarks[12];
      const valid = (leftS.visibility || 0.8) > 0.35 && (rightS.visibility || 0.8) > 0.35;
      if (valid) {
        shoulderY = ((leftS.y + rightS.y) * 0.5) * this.stageHeight;
      }
    }

    if (shoulderY !== null) {
      player.shoulderYSmooth = player.shoulderYSmooth === null
        ? shoulderY
        : player.shoulderYSmooth * 0.7 + shoulderY * 0.3;
      player.shoulderSeenAt = now;
    } else if (now - player.shoulderSeenAt > 2000) {
      player.shoulderYSmooth = this.stageHeight * 0.36; // 預設肩線高度
    }

    const baseShoulderY = player.shoulderYSmooth || (this.stageHeight * 0.36);

    // 2. 取得雙手位置
    let handsData = this.resolveHands(handLandmarks, poseLandmarks, isP1);

    if (handsData) {
      player.lastHandsData = handsData;
      player.handsSeenAt = now;
    } else if (now - player.handsSeenAt < HAND_LOSS_GRACE_MS) {
      handsData = player.lastHandsData; // 寬限期記憶
    }

    if (!handsData) {
      player.togetherStreak = 0;
      player.pullStreak = 0;
      player.state = 'IDLE';
      player.chargeMs = 0;
      player.pouch = { ...player.anchor };
      return;
    }

    // 指數平滑
    const alphaHand = 0.45;
    player.smoothMidX = player.smoothMidX === null
      ? handsData.midX
      : player.smoothMidX * (1 - alphaHand) + handsData.midX * alphaHand;
    player.smoothMidY = player.smoothMidY === null
      ? handsData.midY
      : player.smoothMidY * (1 - alphaHand) + handsData.midY * alphaHand;
    player.smoothDist = player.smoothDist === null
      ? handsData.distance
      : player.smoothDist * (1 - alphaHand) + handsData.distance * alphaHand;

    const midX = player.smoothMidX;
    const midY = player.smoothMidY;
    const dist = player.smoothDist;
    const togetherThreshold = Math.min(200, this.stageWidth * 0.28);
    const isTogether = dist < togetherThreshold;

    if (isTogether) player.togetherStreak++;
    else player.togetherStreak = 0;

    const pullEnterThreshold = baseShoulderY + 45;
    const cancelThreshold = baseShoulderY + 20;

    // 狀態機運算
    if (player.state === 'IDLE') {
      const isAboveShoulder = midY < (baseShoulderY + 20);
      if (player.togetherStreak >= 3 && isAboveShoulder) {
        player.state = 'READY';
        player.pullStreak = 0;
        player.chargeMs = 0;
        dualSound.playClick();
      }
    } else if (player.state === 'READY') {
      const isBelowPull = midY >= pullEnterThreshold;
      if (player.togetherStreak >= 2 && isBelowPull) {
        player.pullStreak++;
        if (player.pullStreak >= 3) {
          player.state = 'PULLING';
          player.chargeMs = 0;
          player.lastChargeSecond = 0;
        }
      } else if (player.togetherStreak === 0 && now - player.handsSeenAt > 300) {
        player.state = 'IDLE';
      }
    } else if (player.state === 'PULLING') {
      const handLost = now - player.handsSeenAt >= 600;
      const isCancelled = midY < cancelThreshold;

      if (isCancelled || (player.togetherStreak === 0 && handLost)) {
        player.state = 'IDLE';
        player.chargeMs = 0;
        player.pouch = { ...player.anchor };
      } else {
        // 更新皮兜與拉弓距離
        player.pouch.x = midX;
        player.pouch.y = midY;

        const maxPull = Math.max(120, this.stageHeight * 0.45);
        const pullDistance = Math.max(0, midY - baseShoulderY);
        player.pullProgress = Math.min(1, Math.max(0.15, pullDistance / maxPull));

        // 瞄準點朝向 Boss
        const deltaX = (midX - player.anchor.x) * 1.6;
        player.target.x = this.boss.x + deltaX;
        player.target.y = this.boss.y - (player.pullProgress * 50);

        // 累計蓄力 3 秒
        if (now - player.handsSeenAt < 400) {
          player.chargeMs += dt;
        }

        const currentSec = Math.floor(player.chargeMs / 1000);
        if (currentSec > player.lastChargeSecond && currentSec < 3) {
          player.lastChargeSecond = currentSec;
          dualSound.playStretch(player.chargeMs / CHARGE_REQUIRED_MS);
        }

        // 滿 3 秒自動破空發射！
        if (player.chargeMs >= CHARGE_REQUIRED_MS) {
          this.fireProjectile(player);
          player.state = 'IDLE';
          player.chargeMs = 0;
          player.pouch = { ...player.anchor };
        }
      }
    }

    if (player.state === 'IDLE' || player.state === 'READY') {
      player.pouch = { ...player.anchor };
    }
  }

  resolveHands(hands, pose, isP1) {
    if (hands && hands.length >= 2) {
      const h1 = hands[0][0];
      const h2 = hands[1][0];
      const x1 = h1.x * this.stageWidth;
      const y1 = h1.y * this.stageHeight;
      const x2 = h2.x * this.stageWidth;
      const y2 = h2.y * this.stageHeight;
      return {
        midX: (x1 + x2) * 0.5,
        midY: (y1 + y2) * 0.5,
        distance: Math.hypot(x2 - x1, y2 - y1),
      };
    } else if (hands && hands.length === 1) {
      const h = hands[0][0];
      return {
        midX: h.x * this.stageWidth,
        midY: h.y * this.stageHeight,
        distance: 40, // 單手預設貼合
      };
    } else if (pose && pose[15] && pose[16]) {
      // 骨架手腕備援
      const w1 = pose[15];
      const w2 = pose[16];
      if ((w1.visibility || 0) > 0.25 || (w2.visibility || 0) > 0.25) {
        const x1 = w1.x * this.stageWidth;
        const y1 = w1.y * this.stageHeight;
        const x2 = w2.x * this.stageWidth;
        const y2 = w2.y * this.stageHeight;
        return {
          midX: (x1 + x2) * 0.5,
          midY: (y1 + y2) * 0.5,
          distance: Math.hypot(x2 - x1, y2 - y1),
        };
      }
    }
    return null;
  }

  fireProjectile(player) {
    const fruit = FRUIT_PELLETS[player.nextFruitIndex % FRUIT_PELLETS.length];
    player.nextFruitIndex = (player.nextFruitIndex + 1) % FRUIT_PELLETS.length;

    const startX = player.pouch.x;
    const startY = player.pouch.y;
    const targetX = player.target.x;
    const targetY = player.target.y;

    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = 22;

    this.projectiles.push({
      shooterId: player.id,
      shooterTheme: player.theme,
      fruit,
      x: startX,
      y: startY,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      targetX,
      targetY,
      rotation: 0,
      radius: 28,
    });

    dualSound.playShoot();
  }

  updateProjectiles(now) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += 0.15;

      // 檢查與 Boss 碰撞
      const distToBoss = Math.hypot(p.x - this.boss.x, p.y - this.boss.y);
      if (distToBoss <= this.boss.hitRadius) {
        this.hitBoss(p, now);
        this.projectiles.splice(i, 1);
        continue;
      }

      // 出界移除
      if (p.x < -100 || p.x > this.stageWidth + 100 || p.y < -100 || p.y > this.stageHeight + 100) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  hitBoss(projectile, now) {
    if (this.boss.defeated) return;

    const isP1 = projectile.shooterId === 'p1';
    const player = isP1 ? this.p1 : this.p2;
    const otherLastHit = isP1 ? this.lastP2HitAt : this.lastP1HitAt;
    const isCombo = (now - otherLastHit) <= COMBO_WINDOW_MS;

    let damage = 40;
    player.hits++;

    if (isCombo) {
      // 💥 觸發雙人合體大爆擊！
      const comboBonus = 130;
      damage += comboBonus;
      this.totalCombos++;
      this.comboBannerUntil = now + 2000;

      // 記錄觸發後拉遠時間，避免同一發多次觸發
      if (isP1) this.lastP1HitAt = now;
      else this.lastP2HitAt = now;

      // 合體技音效 & 特效
      dualSound.playDualCombo();
      this.spawnComboShockwave(this.boss.x, this.boss.y);
      this.spawnComboParticles(this.boss.x, this.boss.y);

      this.popups.push({
        text: `💥 雙人合擊！-${damage}`,
        x: this.boss.x,
        y: this.boss.y - 70,
        color: '#facc15',
        scale: 1.8,
        life: 1.0,
      });
    } else {
      // 一般命中
      if (isP1) this.lastP1HitAt = now;
      else this.lastP2HitAt = now;

      dualSound.playBossHit();
      this.spawnHitParticles(projectile.x, projectile.y, projectile.fruit.color);

      this.popups.push({
        text: `-${damage}`,
        x: projectile.x,
        y: projectile.y - 30,
        color: projectile.shooterTheme === 'orange' ? '#fb923c' : '#60a5fa',
        scale: 1.2,
        life: 1.0,
      });
    }

    player.totalDamage += damage;
    this.boss.hp = Math.max(0, this.boss.hp - damage);
    this.boss.shakeUntil = now + 400;
    this.boss.flashRedUntil = now + 250;

    if (this.boss.hp <= 0) {
      this.endGame(true);
    }
  }

  spawnHitParticles(x, y, color) {
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 6;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 5 + Math.random() * 8,
        color,
        life: 1.0,
      });
    }
  }

  spawnComboParticles(x, y) {
    const rainbowColors = ['#facc15', '#f43f5e', '#38bdf8', '#4ade80', '#fb923c', '#e879f9'];
    for (let i = 0; i < 48; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 12;
      const color = rainbowColors[Math.floor(Math.random() * rainbowColors.length)];
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 7 + Math.random() * 12,
        color,
        life: 1.0,
      });
    }
  }

  spawnComboShockwave(x, y) {
    this.shockwaves.push({
      x,
      y,
      radius: 20,
      maxRadius: Math.min(360, this.stageWidth * 0.45),
      color: 'rgba(250, 204, 21, 0.85)',
      life: 1.0,
    });
  }

  updateEffects(dt, now) {
    // 震動運算
    if (now < this.boss.shakeUntil) {
      this.boss.shakeX = (Math.random() - 0.5) * 18;
      this.boss.shakeY = (Math.random() - 0.5) * 12;
    } else {
      this.boss.shakeX = 0;
      this.boss.shakeY = 0;
    }

    // 粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // 重力
      p.life -= dt * 0.0016;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // 衝擊波
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += dt * 0.4;
      s.life -= dt * 0.0018;
      if (s.life <= 0 || s.radius >= s.maxRadius) this.shockwaves.splice(i, 1);
    }

    // 飄字
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const popup = this.popups[i];
      popup.y -= dt * 0.06;
      popup.life -= dt * 0.0012;
      if (popup.life <= 0) this.popups.splice(i, 1);
    }
  }

  endGame(isVictory) {
    this.phase = 'FINISHED';
    this.result = isVictory ? 'VICTORY' : 'DEFEAT';
    if (isVictory) {
      this.boss.defeated = true;
      dualSound.playVictory();
    } else {
      dualSound.playTimeUp();
    }
  }
}
