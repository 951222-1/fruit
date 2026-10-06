import { sound } from '../services/audio.js';

export class SlingshotGame {
  constructor() {
    this.phase = 'CALIBRATION'; // 'CALIBRATION' | 'COUNTDOWN' | 'PLAYING' | 'FINISHED'
    this.tutorialStep = 1; // 1: 與肩平行, 2: 往下拉弓, 3: 蓄力3秒, 4: 完成
    this.tutorialStepTimer = 0;

    // 1 分鐘計時
    this.timeLeft = 60;
    this.lastTickTime = 0;
    this.score = 0;
    this.fruitsHit = 0;

    // 彈弓狀態
    this.slingshotState = 'IDLE'; // 'IDLE' | 'READY' | 'PULLING'
    this.anchor = { x: 0, y: 0 };
    this.pouch = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };
    this.pullProgress = 0;
    this.handsOpen = false;

    // 蓄力射擊：維持拉弓姿勢 3 秒才自動發射
    this.CHARGE_REQUIRED_MS = 3000;
    this.chargeMs = 0;
    this.lastChargeSecond = 0;
    this.lastUpdateTime = 0;

    // 偵測穩定性：平滑、肩線記憶、斷線寬限、防抖計數
    this.smoothMidX = null;
    this.smoothMidY = null;
    this.smoothDist = null;
    this.shoulderYSmooth = null;
    this.shoulderSeenAt = 0;
    this.handsSeenAt = 0;
    this.lastHandsData = null;
    this.togetherStreak = 0;
    this.pullStreak = 0;
    this.outZoneAt = 0;

    this.fruits = [];
    this.projectiles = [];
    this.popups = [];
    this.targetedFruitId = null;
  }

  init(width, height) {
    this.initFruits(width, height);
    this.updateAnchor(width, height);
  }

  updateAnchor(width, height) {
    this.anchor.x = width / 2;
    this.anchor.y = height * 0.76;
    if (this.slingshotState !== 'PULLING') {
      this.pouch.x = this.anchor.x;
      this.pouch.y = this.anchor.y - 58;
    }
  }

  // 頂部 7 顆豐富水果佈局（橫跨整片頂部樹梢）
  initFruits(width, height) {
    const configs = [
      { id: 0, name: '紅蘋果', icon: '🍎', color: '#ef4444', haloColor: 'rgba(239, 68, 68, 0.75)', particleColor: '#f87171', score: 10, xRatio: 0.12, y: 100 },
      { id: 1, name: '甜橙', icon: '🍊', color: '#f97316', haloColor: 'rgba(249, 115, 22, 0.75)', particleColor: '#fb923c', score: 10, xRatio: 0.24, y: 125 },
      { id: 2, name: '水蜜桃', icon: '🍑', color: '#f472b6', haloColor: 'rgba(244, 114, 182, 0.75)', particleColor: '#fbcfe8', score: 15, xRatio: 0.37, y: 88 },
      { id: 3, name: '大紅蘋', icon: '🍎', color: '#ef4444', haloColor: 'rgba(239, 68, 68, 0.75)', particleColor: '#f87171', score: 10, xRatio: 0.50, y: 115 },
      { id: 4, name: '水蜜桃', icon: '🍑', color: '#f472b6', haloColor: 'rgba(244, 114, 182, 0.75)', particleColor: '#fbcfe8', score: 15, xRatio: 0.63, y: 88 },
      { id: 5, name: '黃檸檬', icon: '🍋', color: '#eab308', haloColor: 'rgba(234, 179, 8, 0.75)', particleColor: '#fef08a', score: 10, xRatio: 0.76, y: 125 },
      { id: 6, name: '青蘋果', icon: '🍏', color: '#84cc16', haloColor: 'rgba(132, 204, 22, 0.75)', particleColor: '#a3e635', score: 20, xRatio: 0.88, y: 100 },
    ];

    this.fruits = configs.map((cfg) => {
      const fx = width * cfg.xRatio;
      const fy = Math.max(70, Math.min(155, height * 0.16 + (cfg.y - 100)));
      return {
        ...cfg,
        originX: fx,
        originY: fy,
        x: fx,
        y: fy,
        radius: Math.min(36, Math.max(26, width * 0.042)),
        state: 'HANGING',
        vy: 0,
        vx: 0,
        rotation: 0,
        scale: 1,
        respawnTimer: 0,
      };
    });
  }

  // 跳過教學直接開玩
  skipTutorial() {
    this.phase = 'PLAYING';
    this.timeLeft = 60;
    this.lastTickTime = performance.now();
    this.resetCharge();
    this.slingshotState = 'IDLE';
    this.lastUpdateTime = performance.now();
    sound.playClick();
  }

  // 重開一局
  restart(width, height) {
    this.phase = 'PLAYING';
    this.timeLeft = 60;
    this.score = 0;
    this.fruitsHit = 0;
    this.projectiles = [];
    this.popups = [];
    this.lastTickTime = performance.now();
    this.resetCharge();
    this.slingshotState = 'IDLE';
    this.lastUpdateTime = performance.now();
    this.initFruits(width, height);
    sound.playClick();
  }

  // 重置蓄力狀態
  resetCharge() {
    this.chargeMs = 0;
    this.lastChargeSecond = 0;
  }

  // 取得手部位置與張手狀態
  getHandsData(handResult, poseResult, width, height) {
    let leftPos = null;
    let rightPos = null;
    let handsAreOpen = false;

    const hands = handResult?.landmarks || [];
    if (hands.length >= 2) {
      const h1 = hands[0];
      const h2 = hands[1];
      const p1 = { x: (1 - h1[9].x) * width, y: h1[9].y * height };
      const p2 = { x: (1 - h2[9].x) * width, y: h2[9].y * height };

      if (p1.x < p2.x) {
        leftPos = p1;
        rightPos = p2;
      } else {
        leftPos = p2;
        rightPos = p1;
      }

      // 張手判定 (指尖到掌心距離)
      const checkOpen = (hand) => {
        const wrist = hand[0];
        const tip8 = hand[8];
        const tip12 = hand[12];
        const dist1 = Math.hypot(tip8.x - wrist.x, tip8.y - wrist.y);
        const dist2 = Math.hypot(tip12.x - wrist.x, tip12.y - wrist.y);
        return dist1 > 0.28 || dist2 > 0.28;
      };

      if (checkOpen(h1) || checkOpen(h2)) {
        handsAreOpen = true;
      }
    } else if (hands.length === 1) {
      const h = hands[0];
      const pt = { x: (1 - h[9].x) * width, y: h[9].y * height };
      leftPos = pt;
      rightPos = pt;
    } else if (poseResult?.landmarks?.[0]) {
      // 完全沒有手 → 嘗試用 pose 手腕（長輩手部常掉偵測，手腕偵測範圍更大）
      const p = poseResult.landmarks[0];
      const lw = p[15];
      const rw = p[16];
      if ((lw?.visibility ?? 0) > 0.25 && (rw?.visibility ?? 0) > 0.25) {
        leftPos = { x: (1 - lw.x) * width, y: lw.y * height };
        rightPos = { x: (1 - rw.x) * width, y: rw.y * height };
      }
    }

    // 輔助 Pose 手腕（單手也用另一側手腕補足）
    if ((!leftPos || !rightPos) && poseResult?.landmarks?.[0]) {
      const p = poseResult.landmarks[0];
      const lw = p[15];
      const rw = p[16];
      if ((lw?.visibility ?? 0) > 0.25 && (rw?.visibility ?? 0) > 0.25) {
        leftPos = leftPos || { x: (1 - lw.x) * width, y: lw.y * height };
        rightPos = rightPos || { x: (1 - rw.x) * width, y: rw.y * height };
      }
    }

    if (!leftPos || !rightPos) return null;

    // 肩膀位置（判定「雙手與肩平行」用）
    let shoulders = null;
    const poseLm = poseResult?.landmarks?.[0];
    if (poseLm) {
      const ls = poseLm[11]; // 左肩
      const rs = poseLm[12]; // 右肩
      if ((ls?.visibility ?? 0) > 0.4 && (rs?.visibility ?? 0) > 0.4) {
        const shL = { x: (1 - ls.x) * width, y: ls.y * height };
        const shR = { x: (1 - rs.x) * width, y: rs.y * height };
        shoulders = {
          left: shL,
          right: shR,
          midX: (shL.x + shR.x) / 2,
          midY: (shL.y + shR.y) / 2,
          span: Math.max(40, Math.hypot(shL.x - shR.x, shL.y - shR.y)),
        };
      }
    }

    const dist = Math.hypot(leftPos.x - rightPos.x, leftPos.y - rightPos.y);
    return {
      leftPos,
      rightPos,
      dist,
      midX: (leftPos.x + rightPos.x) / 2,
      midY: (leftPos.y + rightPos.y) / 2,
      handsAreOpen,
      shoulders,
    };
  }

  update({ handResult, poseResult }, renderer, width, height) {
    this.updateAnchor(width, height);
    let handsData = this.getHandsData(handResult, poseResult, width, height);
    const now = performance.now();

    // 偵測穩定性處理：短暫遺失寬限 + 指數平滑
    if (handsData) {
      this.handsSeenAt = now;
      this.lastHandsData = handsData;

      const a = 0.45; // 平滑係數（越小越穩、越大越靈敏）
      this.smoothMidX = this.smoothMidX == null ? handsData.midX : this.smoothMidX + a * (handsData.midX - this.smoothMidX);
      this.smoothMidY = this.smoothMidY == null ? handsData.midY : this.smoothMidY + a * (handsData.midY - this.smoothMidY);
      this.smoothDist = this.smoothDist == null ? handsData.dist : this.smoothDist + a * (handsData.dist - this.smoothDist);
      handsData = { ...handsData, midX: this.smoothMidX, midY: this.smoothMidY, dist: this.smoothDist };

      if (handsData.shoulders) {
        const sy = handsData.shoulders.midY;
        this.shoulderYSmooth = this.shoulderYSmooth == null ? sy : this.shoulderYSmooth + 0.3 * (sy - this.shoulderYSmooth);
        this.shoulderSeenAt = now;
      }
    } else if (this.slingshotState === 'PULLING' && this.lastHandsData && now - this.handsSeenAt < 600) {
      // 拉弓中手部短暫抓不到（<0.6 秒）：沿用最後位置，蓄力不會被誤重置
      handsData = this.lastHandsData;
    }

    // 處理計時邏輯 (僅在 PLAYING 階段)
    if (this.phase === 'PLAYING') {
      this.handleCountdown();
    }

    // 處理手勢互動
    this.handleSlingshotLogic(handsData, width, height);

    // 繪製背景元素
    renderer.drawTreeCanopy(width, height);

    // 更新並繪製水果
    this.updateAndDrawFruits(renderer, width, height);

    // 更新並繪製飛行彈丸
    this.updateAndDrawProjectiles(renderer, width, height);

    // 繪製彈弓與雙手
    const isPulling = this.slingshotState === 'PULLING';
    renderer.drawSlingshotWithHands(
      this.anchor.x,
      this.anchor.y,
      this.pouch.x,
      this.pouch.y,
      isPulling,
      this.handsOpen
    );

    // 拉弓時繪製發光瞄準拋物虛線與準星（含 3 秒蓄力進度）
    if (isPulling) {
      const chargeRatio = Math.min(1, this.chargeMs / this.CHARGE_REQUIRED_MS);
      const chargeSecs = Math.max(0, Math.ceil((this.CHARGE_REQUIRED_MS - this.chargeMs) / 1000));
      renderer.drawAimingTrajectory(
        this.pouch.x,
        this.pouch.y,
        this.target.x,
        this.target.y,
        this.pullProgress,
        chargeRatio,
        chargeSecs
      );
    }

    // 粒子與飄字
    renderer.renderParticles();
    renderer.drawScorePopups(this.popups);

    // 繪製左下角立式木牌 (在正式遊戲或時間結束時顯示)
    if (this.phase === 'PLAYING' || this.phase === 'FINISHED') {
      renderer.drawBottomLeftSignpost(
        24,
        height - 70,
        this.timeLeft,
        this.score,
        this.fruitsHit
      );
    }

    // 繪製中央教學木牌 (校準階段)
    if (this.phase === 'CALIBRATION') {
      const chargeInfo = this.tutorialStep === 3
        ? { chargeRatio: Math.min(1, this.chargeMs / this.CHARGE_REQUIRED_MS), secLeft: Math.max(0, Math.ceil((this.CHARGE_REQUIRED_MS - this.chargeMs) / 1000)) }
        : null;
      renderer.drawTutorialSignboard(this.tutorialStep, width, height, chargeInfo);
    }

    // 繪製時間到結算木牌
    if (this.phase === 'FINISHED') {
      renderer.drawSettlementSignboard(this.score, this.fruitsHit, width, height);
    }
  }

  // 1 分鐘倒數計時處理
  handleCountdown() {
    const now = performance.now();
    if (now - this.lastTickTime >= 1000) {
      this.timeLeft -= 1;
      this.lastTickTime = now;

      // 最後 10 秒播放急促滴答聲
      if (this.timeLeft <= 10 && this.timeLeft > 0) {
        sound.playTick();
      }

      // 時間到！
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.phase = 'FINISHED';
        this.slingshotState = 'IDLE';
        sound.playTimeUp();
      }
    }
  }

  handleSlingshotLogic(handsData, width, height) {
    const now = performance.now();
    const dt = this.lastUpdateTime > 0 ? Math.min(100, now - this.lastUpdateTime) : 16;
    this.lastUpdateTime = now;
    const restingY = this.anchor.y - 58;

    // 手不在畫面：取消蓄力、歸位（不再誤射）
    if (!handsData) {
      if (this.slingshotState === 'PULLING') {
        this.resetCharge();
        this.slingshotState = 'IDLE';
      }
      this.pouch.x = this.anchor.x;
      this.pouch.y = restingY;
      this.handsOpen = false;
      return;
    }

    const { midX, midY, shoulders } = handsData;
    this.handsOpen = handsData.handsAreOpen;

    // ===== 穩定肩線：優先用平滑記憶值，2 秒內抓不到肩也不亂跳 =====
    let shoulderY;
    if (this.shoulderYSmooth != null && now - this.shoulderSeenAt < 2000) {
      shoulderY = this.shoulderYSmooth;
    } else if (shoulders) {
      shoulderY = shoulders.midY;
    } else {
      shoulderY = height * 0.3;
    }

    // ===== 步驟 1 判定：雙手併攏且舉在肩膀以上 =====
    const handsTogether = handsData.dist <= Math.min(180, width * 0.25);
    const aboveShoulder = midY <= shoulderY + 15;

    // ===== 步驟 2 判定：雙手往下拉（低於肩線的距離） =====
    const pullDelta = midY - shoulderY;

    // ===== 防抖：狀態切換需連續命中（併攏 3 幀、進入拉弓 4 幀） =====
    this.togetherStreak = handsTogether ? this.togetherStreak + 1 : 0;
    this.pullStreak = pullDelta > 45 ? this.pullStreak + 1 : 0;
    const handsTogetherStable = this.togetherStreak >= 3;
    const pullReadyStable = this.pullStreak >= 4;

    // ===== 動作校準教學流程檢測 =====
    if (this.phase === 'CALIBRATION') {
      if (this.tutorialStep === 1 && handsTogetherStable && aboveShoulder) {
        this.tutorialStep = 2;
        sound.playCheck();
      } else if (this.tutorialStep === 2 && pullDelta > 60) {
        // 從肩線以上拉到肩線以下 60px → 明確的下拉動作
        this.tutorialStep = 3;
        this.slingshotState = 'PULLING';
        this.resetCharge();
        this.lastChargeSecond = Math.ceil(this.CHARGE_REQUIRED_MS / 1000);
        sound.playCheck();
      } else if (this.tutorialStep === 3) {
        if (pullDelta <= 30) {
          // 姿勢跑掉：取消拉弓，蓄力歸零重來
          this.slingshotState = 'READY';
          this.resetCharge();
          this.lastChargeSecond = Math.ceil(this.CHARGE_REQUIRED_MS / 1000);
        }
        // 蓄力與自動發射由下方 PULLING 分支統一處理
      }
    }

    // 彈弓物理與拉力控制 (禁止在 FINISHED 階段操作)
    if (this.phase === 'FINISHED') return;

    if (this.slingshotState !== 'PULLING') {
      // 待機：雙手併攏舉高過肩 → 抓住皮兜進入 READY
      // 維持併攏往下拉、低於肩線 45px（連續 4 幀）→ 進入 PULLING 蓄力
      if (handsTogetherStable) {
        if (this.slingshotState === 'READY') {
          // 已抓住皮兜：往下拉過肩線才轉 PULLING（此階段不再要求肩上）
          if (pullReadyStable) {
            this.slingshotState = 'PULLING';
            this.resetCharge();
            this.lastChargeSecond = Math.ceil(this.CHARGE_REQUIRED_MS / 1000);
          }
        } else if (aboveShoulder) {
          // 尚未抓住：併攏且舉在肩上才吸附皮兜
          this.slingshotState = 'READY';
        } else {
          this.slingshotState = 'IDLE';
        }
      } else {
        this.slingshotState = 'IDLE';
      }
      if (this.slingshotState !== 'PULLING') {
        this.pouch.x = this.anchor.x;
        this.pouch.y = restingY;
        this.resetCharge();
      }
    } else {
      // 拉弓中：雙手明確分開超過 0.25 秒 → 取消（放手不算射擊，短暫抖動不中斷）
      if (!handsTogether) {
        if (this.outZoneAt === 0) this.outZoneAt = now;
        if (now - this.outZoneAt > 250) {
          this.slingshotState = 'IDLE';
          this.pouch.x = this.anchor.x;
          this.pouch.y = restingY;
          this.resetCharge();
          this.outZoneAt = 0;
          return;
        }
      } else {
        this.outZoneAt = 0;
      }
      // 拉回肩線上方（20px 內）→ 回到 READY，蓄力歸零（放寬：只回到 45 門檻之上就保留）
      if (pullDelta < 25) {
        this.slingshotState = 'READY';
        this.pouch.x = this.anchor.x;
        this.pouch.y = restingY;
        this.resetCharge();
        return;
      }

      const maxPullY = height * 0.22;
      const clampedDeltaY = Math.min(maxPullY, pullDelta);
      const deltaX = midX - this.anchor.x;

      this.pouch.x = this.anchor.x + deltaX * 0.75;
      this.pouch.y = restingY + clampedDeltaY;

      this.pullProgress = Math.min(1, Math.max(0.1, clampedDeltaY / maxPullY));
      sound.playStretch(this.pullProgress);

      // 瞄準位置計算：
      // 規則 1：拉得越低，射的位置越高 (Y 座標越小)
      const minTargetY = 65;
      const maxTargetY = height * 0.35;
      const targetY = maxTargetY - this.pullProgress * (maxTargetY - minTargetY);

      // 規則 2：左右偏轉瞄準
      const targetX = this.anchor.x - deltaX * 1.85;

      this.target.x = Math.max(width * 0.08, Math.min(width * 0.92, targetX));
      this.target.y = targetY;

      // 尋找當前瞄準的水果 (給予光環高亮)
      this.targetedFruitId = null;
      for (const fruit of this.fruits) {
        if (fruit.state === 'HANGING') {
          const d = Math.hypot(this.target.x - fruit.x, this.target.y - fruit.y);
          if (d <= fruit.radius + 24) {
            this.targetedFruitId = fruit.id;
            break;
          }
        }
      }

      // ===== 步驟 3：維持姿勢 3 秒 → 自動發射 =====
      if (this.phase === 'PLAYING' || this.phase === 'CALIBRATION') {
        this.chargeMs += dt;
        const secLeft = Math.ceil((this.CHARGE_REQUIRED_MS - this.chargeMs) / 1000);
        if (secLeft < this.lastChargeSecond && secLeft > 0) {
          this.lastChargeSecond = secLeft;
          sound.playTick();
        }
        if (this.chargeMs >= this.CHARGE_REQUIRED_MS) {
          this.resetCharge();
          this.fireProjectile();

          // 教學第 3 步完成 → 晉級並延遲 1.2 秒收起木牌進入 60 秒遊戲
          if (this.phase === 'CALIBRATION' && this.tutorialStep === 3) {
            this.tutorialStep = 4;
            sound.playCheck();
            setTimeout(() => {
              this.skipTutorial();
            }, 1200);
          }
        }
      }
    }
  }

  // 射出彈丸
  fireProjectile() {
    this.slingshotState = 'IDLE';
    sound.playShoot();

    const startX = this.pouch.x;
    const startY = this.pouch.y;
    const destX = this.target.x;
    const destY = this.target.y;

    const flightDuration = 20; // 幀數
    this.projectiles.push({
      x: startX,
      y: startY,
      vx: (destX - startX) / flightDuration,
      vy: (destY - startY) / flightDuration,
      destX,
      destY,
      radius: 9.5,
      framesLeft: flightDuration,
      trail: [{ x: startX, y: startY }],
    });

    this.pouch.x = this.anchor.x;
    this.pouch.y = this.anchor.y - 58;
  }

  updateAndDrawFruits(renderer, width, _height) {
    const now = performance.now();

    for (const fruit of this.fruits) {
      const isTargeted = this.slingshotState === 'PULLING' && this.targetedFruitId === fruit.id;

      if (fruit.state === 'HANGING') {
        renderer.drawFruit(fruit, isTargeted);
      } else if (fruit.state === 'FALLING') {
        fruit.y += fruit.vy;
        fruit.x += fruit.vx;
        fruit.vy += 0.45;
        fruit.rotation += fruit.angularVelocity || 0.08;

        renderer.drawFruit(fruit, false);

        if (fruit.y > renderer.canvas.height + 60) {
          fruit.state = 'RESPAWNING';
          fruit.respawnTimer = now + 2500;
        }
      } else if (fruit.state === 'RESPAWNING') {
        if (now >= fruit.respawnTimer) {
          fruit.state = 'HANGING';
          fruit.x = fruit.originX;
          fruit.y = fruit.originY;
          fruit.vy = 0;
          fruit.vx = 0;
          fruit.rotation = 0;
          sound.playFruitRespawn();
          renderer.addJuiceParticles(fruit.x, fruit.y, fruit.particleColor, 10);
          renderer.drawFruit(fruit, false);
        }
      }
    }
  }

  updateAndDrawProjectiles(renderer, width, height) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.x += proj.vx;
      proj.y += proj.vy;
      proj.framesLeft -= 1;

      proj.trail.push({ x: proj.x, y: proj.y });
      if (proj.trail.length > 6) {
        proj.trail.shift();
      }

      renderer.drawProjectile(proj);

      let hit = false;
      for (const fruit of this.fruits) {
        if (fruit.state !== 'HANGING') continue;

        const dist = Math.hypot(proj.x - fruit.x, proj.y - fruit.y);
        if (dist <= fruit.radius + proj.radius + 14) {
          hit = true;
          fruit.state = 'FALLING';
          fruit.vy = 1.2;
          fruit.vx = (proj.vx * 0.3) + (Math.random() - 0.5) * 2;
          fruit.angularVelocity = (Math.random() > 0.5 ? 1 : -1) * (0.07 + Math.random() * 0.09);

          this.fruitsHit += 1;
          this.score += fruit.score;

          sound.playFruitHit();
          renderer.addJuiceParticles(fruit.x, fruit.y, fruit.particleColor, 26);

          this.popups.push({
            x: fruit.x,
            y: fruit.y - 12,
            vy: -1.7,
            alpha: 1,
            text: `+${fruit.score} ${fruit.icon}`,
            color: fruit.particleColor,
          });
          break;
        }
      }

      if (hit || proj.framesLeft <= 0 || proj.y < -30 || proj.x < -30 || proj.x > width + 30) {
        this.projectiles.splice(i, 1);
      }
    }
  }
}
