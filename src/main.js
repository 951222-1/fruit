import { sound } from './services/audio.js';
import { CameraManager } from './services/camera.js';
import { visionEngine } from './services/vision.js';
import { GameRenderer } from './render/gameRenderer.js';
import { SlingshotGame } from './game/slingshotGame.js';
import './style.css';

const ART_BASE_URL = `${import.meta.env.BASE_URL}art/`;
const app = document.querySelector('#app');
app.innerHTML = `
  <main class="shell">
    <header class="hero">
      <div class="title-wrap">
        <h1>體感彈弓射水果 🏹</h1>
        <p>1 分鐘限時挑戰！雙手併攏舉高過肩、往下拉弓，續力 3 秒自動發射。</p>
      </div>
      <div class="hero-actions">
        <button class="secondary" id="soundToggle">🔊 音效</button>
        <div class="badge"><span class="dot" id="statusDot"></span><span id="status">尚未啟動</span></div>
      </div>
    </header>

    <section class="stage-card">
      <div class="play-area" id="playArea">
        <div class="stage" id="stage">
          <video id="webcam" autoplay playsinline muted></video>
          <canvas id="overlay"></canvas>

          <!-- 畫面內部浮動按鈕 -->
          <div class="overlay-controls">
            <button class="glass-btn" id="skipTutorialBtn" style="display: none;">跳過教學 ⏩</button>
            <button class="glass-btn" id="helpBtn">？動作教學</button>
          </div>

          <div class="empty-state" id="emptyState">
            <div class="camera-icon">🏹</div>
            <h2>選擇遊戲模式</h2>
            <p>先選一種玩法，再啟動 Webcam 開始遊戲。</p>
            <div class="mode-picker" role="group" aria-label="選擇遊戲模式">
              <button class="mode-card selected" type="button" data-mode="CLASSIC" aria-pressed="true">
                <strong>🎯 經典彈弓</strong>
                <span>想射哪種就射哪種；每顆水果命中固定 +15 分。</span>
              </button>
              <button class="mode-card" type="button" data-mode="HARVEST" aria-pressed="false">
                <strong>🍎 水果採收</strong>
                <span>每局指定一種當季水果；其他種類也能打落並得 5 分。</span>
              </button>
              <button class="mode-card" type="button" data-mode="HARVEST_HARD" aria-pressed="false">
                <strong>🐝 水果採集困難版</strong>
                <span>1–2個原水果位換蜂巢；射中扣5分，15秒未擊落自動掉落；水果重生30%機率變蜂巢（最多2個）。</span>
              </button>
            </div>
            <button class="primary" id="emptyStartBtn" style="margin-top: 16px; padding: 12px 24px; font-size: 16px;">啟動 Webcam 🎥</button>
          </div>

          <div class="harvest-rules" id="harvestRules" hidden>
            <div class="harvest-rules-card">
              <p class="rules-eyebrow">本回合採收</p>
              <img class="rules-fruit-image" id="rulesFruitIcon" alt="" />
              <h2 id="rulesFruitName">紅蘋果</h2>
              <p class="rules-main">當季水果照原分數採收！</p>
              <p class="rules-wrong">其他水果也能打落：<strong>不是當季水果！+5分</strong></p>
              <p class="rules-hive" id="hardHarvestRule" hidden>困難版：射中蜂巢扣5分。計時開始後，15秒沒打落會自動掉；水果重生30%機率變蜂巢（最多同時2個）。蜂巢掉落後2.5秒原位長回隨機水果；最低0分。</p>
              <p class="rules-gesture">雙手併攏抬高過肩，像拉彈弓一樣往下拉；續力 3 秒射出第一發。</p>
              <p class="rules-start-hint">確認後，第一發射出才開始 60 秒挑戰。</p>
              <button class="primary" id="confirmHarvestRulesBtn" type="button">我知道了，準備開始</button>
            </div>
          </div>

          <div class="start-countdown" id="startCountdown" hidden aria-live="assertive">
            <div class="countdown-card">
              <span class="countdown-caption">準備拉弓</span>
              <strong class="countdown-value" id="countdownValue">3</strong>
              <span class="countdown-hint">GO 後，續力射出第一發開始計時</span>
            </div>
          </div>
        </div>

        <aside class="harvest-sign" id="harvestSign" hidden aria-live="polite">
          <div class="sign-rope"></div>
          <div class="sign-board">
            <span class="sign-label">本回合採收</span>
            <img class="sign-fruit" id="signFruitIcon" alt="" />
            <strong class="sign-name" id="signFruitName">紅蘋果</strong>
          </div>
          <div class="sign-post"></div>
        </aside>
      </div>

      <div class="controls">
        <button class="primary" id="startButton">啟動 Webcam</button>
        <button class="secondary" id="stopButton" disabled>停止</button>
        <button class="action-btn" id="restartButton" disabled>再玩一局 🔄</button>
        <div class="metrics">
          <span>FPS <strong id="fps">—</strong></span>
          <span>辨識 <strong id="detection">—</strong></span>
          <span>狀態 <strong id="gamePhaseText">等待啟動</strong></span>
        </div>
      </div>
    </section>

    <section class="footer-tips">
      <div class="tip-card mode-specific-tip">
        <h3 id="modeTipTitle">🎯 經典彈弓</h3>
        <p id="modeTipText">想射哪種水果都可以；每顆命中固定 +15 分。</p>
      </div>
      <div class="tip-card">
        <h3>1. 雙手併攏舉高過肩 ✋</h3>
        <p>雙手靠近併攏，舉到肩膀以上的高度，彈弓皮兜會自動吸附。</p>
      </div>
      <div class="tip-card">
        <h3>2. 往下拉弓 ⬇</h3>
        <p>併攏的雙手一口氣往下拉過肩！拉得越低射得越高，可左右微調準星。</p>
      </div>
      <div class="tip-card">
        <h3>3. 續力 3 秒發射 ⏱️</h3>
        <p>拉住皮兜續力 3 秒，蓄力圈蓄滿瞬間彈丸自動破空射出！</p>
      </div>
    </section>
  </main>
`;

// DOM 引用
const video = document.querySelector('#webcam');
const canvas = document.querySelector('#overlay');
const stage = document.querySelector('#stage');
const playArea = document.querySelector('#playArea');
const emptyState = document.querySelector('#emptyState');
const harvestRules = document.querySelector('#harvestRules');
const hardHarvestRule = document.querySelector('#hardHarvestRule');
const rulesGesture = document.querySelector('.rules-gesture');
const rulesStartHint = document.querySelector('.rules-start-hint');
const startCountdown = document.querySelector('#startCountdown');
const countdownValue = document.querySelector('#countdownValue');
const confirmHarvestRulesBtn = document.querySelector('#confirmHarvestRulesBtn');
const harvestSign = document.querySelector('#harvestSign');
const signFruitIcon = document.querySelector('#signFruitIcon');
const signFruitName = document.querySelector('#signFruitName');
const rulesFruitIcon = document.querySelector('#rulesFruitIcon');
const rulesFruitName = document.querySelector('#rulesFruitName');
const modeTipTitle = document.querySelector('#modeTipTitle');
const modeTipText = document.querySelector('#modeTipText');
const modeCards = [...document.querySelectorAll('.mode-card')];
const startButton = document.querySelector('#startButton');
const emptyStartBtn = document.querySelector('#emptyStartBtn');
const stopButton = document.querySelector('#stopButton');
const restartButton = document.querySelector('#restartButton');
const soundToggle = document.querySelector('#soundToggle');
const skipTutorialBtn = document.querySelector('#skipTutorialBtn');
const helpBtn = document.querySelector('#helpBtn');
const statusEl = document.querySelector('#status');
const statusDot = document.querySelector('#statusDot');
const fpsEl = document.querySelector('#fps');
const detectionEl = document.querySelector('#detection');
const gamePhaseText = document.querySelector('#gamePhaseText');

// 模組實例化
const camera = new CameraManager(video);
const renderer = new GameRenderer(canvas);
const game = new SlingshotGame();

let selectedMode = 'CLASSIC';
let running = false;
let lastVideoTime = -1;
let frameCount = 0;
let lastFpsUpdate = performance.now();

function selectMode(mode) {
  selectedMode = mode;
  const isHardHarvest = mode === 'HARVEST_HARD';
  const isHarvest = mode === 'HARVEST' || isHardHarvest;
  playArea.classList.toggle('harvest-mode', isHarvest);
  playArea.classList.toggle('hard-harvest-mode', isHardHarvest);
  rulesGesture.textContent = isHardHarvest
    ? '手勢同教學：雙手併攏下拉，續力 3 秒。'
    : '雙手併攏抬高過肩，像拉彈弓一樣往下拉；續力 3 秒射出第一發。';
  rulesStartHint.textContent = isHardHarvest
    ? '第一發射出才開始 60 秒挑戰。'
    : '確認後，第一發射出才開始 60 秒挑戰。';
  modeCards.forEach((card) => {
    const selected = card.dataset.mode === mode;
    card.classList.toggle('selected', selected);
    card.setAttribute('aria-pressed', String(selected));
  });

  modeTipTitle.textContent = isHardHarvest ? '🐝 水果採集困難版' : (isHarvest ? '🍎 當季水果採收' : '🎯 經典彈弓');
  modeTipText.textContent = isHardHarvest
    ? '蜂巢命中扣5分，15秒未擊落會掉落；水果重生30%機率變蜂巢（最多2個）。'
    : (isHarvest
      ? '牌子上的水果照原分數；其他水果也能打落，固定 +5 分。'
      : '想射哪種就射哪種；每顆水果命中固定 +15 分。');
  const startLabel = isHardHarvest
    ? '啟動 Webcam · 水果採集困難版 🐝'
    : (isHarvest ? '啟動 Webcam · 水果採收 🍎' : '啟動 Webcam · 經典彈弓 🎯');
  startButton.textContent = startLabel;
  emptyStartBtn.textContent = startLabel;
}

function syncHarvestUi() {
  const target = game.harvestTarget;
  const showSign = running && selectedMode !== 'CLASSIC' && Boolean(target);
  harvestSign.hidden = !showSign;
  harvestRules.hidden = !(running && game.phase === 'RULES');
  hardHarvestRule.hidden = !(running && selectedMode === 'HARVEST_HARD' && game.phase === 'RULES');
  const showCountdown = running && game.phase === 'COUNTDOWN';
  startCountdown.hidden = !showCountdown;
  countdownValue.textContent = game.countdownValue || '3';
  countdownValue.classList.toggle('go', game.countdownValue === 'GO!');

  if (target) {
    const imageUrl = `${ART_BASE_URL}${target.assetKey}`;
    if (signFruitIcon.getAttribute('src') !== imageUrl) signFruitIcon.src = imageUrl;
    signFruitIcon.alt = target.name;
    signFruitName.textContent = target.name;
    if (rulesFruitIcon.getAttribute('src') !== imageUrl) rulesFruitIcon.src = imageUrl;
    rulesFruitIcon.alt = target.name;
    rulesFruitName.textContent = target.name;
  }
}

// 模式選擇
modeCards.forEach((card) => {
  card.addEventListener('click', () => {
    if (!running) selectMode(card.dataset.mode);
  });
});
selectMode(selectedMode);

confirmHarvestRulesBtn.addEventListener('click', () => {
  game.confirmHarvestRules();
  sound.playClick();
  syncHarvestUi();
});

// 音效開關切換
soundToggle.addEventListener('click', () => {
  sound.enabled = !sound.enabled;
  soundToggle.textContent = sound.enabled ? '🔊 音效' : '🔇 靜音';
  sound.playClick();
});

// 跳過教學
skipTutorialBtn.addEventListener('click', () => {
  game.skipTutorial();
  skipTutorialBtn.style.display = 'none';
});

// 重新打開教學
helpBtn.addEventListener('click', () => {
  sound.playClick();
  game.phase = 'CALIBRATION';
  game.tutorialStep = 1;
  skipTutorialBtn.style.display = 'inline-flex';
});

function updateFps() {
  frameCount += 1;
  const now = performance.now();
  if (now - lastFpsUpdate >= 1000) {
    fpsEl.textContent = String(Math.round((frameCount * 1000) / (now - lastFpsUpdate)));
    frameCount = 0;
    lastFpsUpdate = now;
  }
}

function renderLoop() {
  if (!running) return;

  if (camera.isReady() && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const timestamp = performance.now();
    const width = stage.clientWidth;
    const height = stage.clientHeight;

    // AI 視覺推論
    const { poseResult, handResult } = visionEngine.detect(video, timestamp);

    // 以使用者提供的樹林插圖作為全畫面背景，再疊去背人像與骨架
    renderer.clear(width, height);
    renderer.drawOrchardBackground(width, height);
    const personVisible = renderer.drawPersonCutout(
      video,
      poseResult?.segmentationMasks?.[0] || null,
      width,
      height
    );

    // 畫面短暫漏掉手腕/手部時，Canvas 會保留最近的手臂線條 0.6 秒
    renderer.drawSkeleton(poseResult?.landmarks?.[0] || null, width, height);

    // 遊戲物理與介面更新
    game.update({ handResult, poseResult }, renderer, width, height);

    // 遮罩暫時掉點時不顯示原始房間背景；保留遊戲與骨架並提醒玩家
    if (!personVisible && (game.phase === 'READY' || game.phase === 'PLAYING')) {
      const notice = visionEngine.segmentationAvailable
        ? '人物辨識中，請站到畫面中央'
        : '人物分離暫不可用，改以骨架輔助';
      renderer.drawPersonMaskNotice(width, height, notice);
    }
    syncHarvestUi();

    // 更新狀態列文字與按鈕
    const isCalibrating = game.phase === 'CALIBRATION';
    skipTutorialBtn.style.display = isCalibrating ? 'inline-flex' : 'none';

    if (game.phase === 'CALIBRATION') {
      gamePhaseText.textContent = `動作校準 (${game.tutorialStep}/3)`;
    } else if (game.phase === 'RULES') {
      gamePhaseText.textContent = '確認本回合採收目標';
    } else if (game.phase === 'COUNTDOWN') {
      gamePhaseText.textContent = `即將開始 ${game.countdownValue}`;
    } else if (game.phase === 'READY') {
      gamePhaseText.textContent = '準備好了，第一發開始計時';
    } else if (game.phase === 'PLAYING') {
      gamePhaseText.textContent = `挑戰中 ⏱️ ${game.timeLeft}s`;
    } else if (game.phase === 'FINISHED') {
      gamePhaseText.textContent = `時間到！得分: ${game.score}`;
    }

    const detected = Boolean(poseResult?.landmarks?.[0] || handResult?.landmarks?.length);
    detectionEl.textContent = !detected
      ? '未入鏡'
      : (personVisible
        ? '人物已分離'
        : (visionEngine.segmentationAvailable ? '人物辨識中' : '僅顯示骨架'));
    updateFps();
    poseResult?.close?.();
  }

  requestAnimationFrame(renderLoop);
}

async function start() {
  if (running) return;
  renderer.resetSkeletonGrace();
  sound.playClick();
  startButton.disabled = true;
  emptyStartBtn.disabled = true;
  statusEl.textContent = '準備啟動…';
  statusDot.className = 'dot';

  try {
    // 依序回報進度
    await visionEngine.init((msg) => {
      statusEl.textContent = msg;
    });

    statusEl.textContent = '載入果園與水果插圖…';
    await renderer.assetsReady;

    statusEl.textContent = '請求攝影機權限…';
    stage.classList.add('person-cutout');
    await camera.start();

    statusEl.textContent = '初始化畫布…';
    renderer.resize(stage);
    game.setMode(selectedMode);
    game.init(stage.clientWidth, stage.clientHeight);

    running = true;
    emptyState.hidden = true;
    stopButton.disabled = false;
    restartButton.disabled = false;
    statusEl.textContent = '遊戲進行中';
    statusDot.className = 'dot active';

    requestAnimationFrame(renderLoop);
  } catch (error) {
    console.error('啟動失敗詳細資訊:', error);
    stage.classList.remove('person-cutout');
    statusEl.textContent = '啟動失敗';
    startButton.disabled = false;
    emptyStartBtn.disabled = false;
    alert(`無法啟動遊戲：\n${error.message}\n\n請確認瀏覽器已允許攝影機權限！`);
  }
}

function stop() {
  sound.playClick();
  running = false;
  camera.stop();
  renderer.resetSkeletonGrace();
  stage.classList.remove('person-cutout');
  renderer.clear(stage.clientWidth, stage.clientHeight);
  emptyState.hidden = false;
  harvestRules.hidden = true;
  startCountdown.hidden = true;
  harvestSign.hidden = true;
  startButton.disabled = false;
  emptyStartBtn.disabled = false;
  stopButton.disabled = true;
  restartButton.disabled = true;
  statusEl.textContent = '已停止';
  statusDot.className = 'dot';
  fpsEl.textContent = '—';
  detectionEl.textContent = '—';
  gamePhaseText.textContent = '已停止';
  skipTutorialBtn.style.display = 'none';
}

startButton.addEventListener('click', start);
emptyStartBtn.addEventListener('click', start);
stopButton.addEventListener('click', stop);
restartButton.addEventListener('click', () => {
  game.restart(stage.clientWidth, stage.clientHeight);
});

window.addEventListener('resize', () => {
  if (running) {
    renderer.resize(stage);
    game.updateAnchor(stage.clientWidth, stage.clientHeight);
  }
});
