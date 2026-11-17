import { dualSound } from './services/audio.js';
import { CameraManager } from './services/camera.js';
import { dualVisionEngine } from './services/vision.js';
import { DualRenderer } from './render/dualRenderer.js';
import { DualBossGame } from './game/dualBossGame.js';
import './style.css';

const singleGameUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5175/'
  : '../';

const app = document.querySelector('#app');
app.innerHTML = `
  <main class="shell">
    <header class="hero">
      <div class="title-wrap">
        <h1>🏹 雙人打怪合作戰：討伐邪惡壞鳥</h1>
        <p>P1 站左側、P2 站右側！雙手拉弓續力 3 秒自動射擊，1.6 秒內相繼命中觸發合體大爆擊！</p>
      </div>
      <div class="hero-actions">
        <a href="${singleGameUrl}" class="glass-btn" style="text-decoration: none; font-weight: bold;">⬅ 回單人模式</a>
        <button class="secondary" id="soundToggle">🔊 音效</button>
        <div class="badge"><span class="dot" id="statusDot"></span><span id="status">尚未啟動</span></div>
      </div>
    </header>

    <section class="stage-card">
      <div class="stage" id="stage">
        <video id="webcam" autoplay playsinline muted></video>
        <canvas id="overlay"></canvas>

        <div class="overlay-controls">
          <button class="glass-btn" id="fullscreenToggle" type="button" aria-label="切換滿版" title="按 Esc 可退出滿版">⛶ 滿版</button>
        </div>

        <div class="empty-state" id="emptyState">
          <div class="empty-icon">👾</div>
          <h2>👥 雙人遊玩模式選擇</h2>
          <p>先確認遊戲玩法，再點選下方按鈕啟動 Webcam 開始戰鬥！</p>
          <div class="mode-picker">
            <button class="mode-card selected" type="button" data-mode="BOSS">
              <strong>👾 雙人打怪合作戰 (邪惡壞鳥)</strong>
              <span>兩位玩家同框！各自拉弓瞄準 Boss，相繼命中觸發金色合體技，90 秒內合力擊退邪惡壞鳥！</span>
            </button>
            <button class="mode-card mode-card-upcoming" type="button" disabled>
              <strong>🚀 敬請期待更多玩法</strong>
              <span>雙人搶果對抗賽、接力障礙挑戰等新模式持續擴充中！</span>
            </button>
          </div>
          <button class="primary" id="emptyStartBtn" style="margin-top: 18px; padding: 12px 28px; font-size: 16px;">啟動 Webcam 🎥</button>
        </div>
      </div>

      <div class="controls">
        <div class="controls-left">
          <button class="primary" id="startButton">啟動 Webcam 🎥</button>
          <button class="secondary" id="stopButton" disabled>停止</button>
          <button class="secondary" id="restartButton" disabled>再戰一局 🔄</button>
        </div>
        <div class="metrics">
          <span>FPS <strong id="fps">—</strong></span>
          <span>辨識 <strong id="detection">—</strong></span>
          <span>挑戰時間 <strong id="timeLeftText">90s</strong></span>
          <span>狀態 <strong id="gamePhaseText">等待啟動</strong></span>
        </div>
      </div>
    </section>

    <section class="footer-tips">
      <div class="tip-card">
        <h3>1. 👤 玩家 1 站左側 (藍隊)</h3>
        <p>站在鏡頭左半邊，雙手靠近併攏舉高過肩，自動吸附左側藍色彈弓！</p>
      </div>
      <div class="tip-card">
        <h3>2. 👤 玩家 2 站右側 (橘隊)</h3>
        <p>站在鏡頭右半邊，雙手靠近併攏舉高過肩，自動吸附右側橘色彈弓！</p>
      </div>
      <div class="tip-card">
        <h3>3. ⏱️ 往下拉弓蓄力 3 秒</h3>
        <p>併攏雙手往下拉過肩，瞄準邪惡壞鳥；維持姿勢蓄力 3 秒自動破空射出！</p>
      </div>
      <div class="tip-card">
        <h3>4. 💥 雙人合體大爆擊！</h3>
        <p>兩人在 1.6 秒內相繼擊中 Boss，直接觸發雙人合體技，爆出大額暴擊傷害！</p>
      </div>
    </section>
  </main>
`;

// DOM 引用
const video = document.querySelector('#webcam');
const canvas = document.querySelector('#overlay');
const stage = document.querySelector('#stage');
const emptyState = document.querySelector('#emptyState');
const startButton = document.querySelector('#startButton');
const emptyStartBtn = document.querySelector('#emptyStartBtn');
const stopButton = document.querySelector('#stopButton');
const restartButton = document.querySelector('#restartButton');
const soundToggle = document.querySelector('#soundToggle');
const fullscreenToggle = document.querySelector('#fullscreenToggle');
const statusEl = document.querySelector('#status');
const statusDot = document.querySelector('#statusDot');
const fpsEl = document.querySelector('#fps');
const detectionEl = document.querySelector('#detection');
const timeLeftText = document.querySelector('#timeLeftText');
const gamePhaseText = document.querySelector('#gamePhaseText');

// 模組實例化
const camera = new CameraManager(video);
const renderer = new DualRenderer(canvas);
const game = new DualBossGame();

let running = false;
let lastVideoTime = -1;
let frameCount = 0;
let lastFpsUpdate = performance.now();

function updateFps() {
  frameCount++;
  const now = performance.now();
  if (now - lastFpsUpdate >= 1000) {
    fpsEl.textContent = String(Math.round((frameCount * 1000) / (now - lastFpsUpdate)));
    frameCount = 0;
    lastFpsUpdate = now;
  }
}

function resizeGameStage() {
  if (!running) return;
  renderer.resize(stage);
  game.resize(stage.clientWidth, stage.clientHeight);
}

function renderLoop() {
  if (!running) return;

  const now = performance.now();
  if (video.currentTime !== lastVideoTime && video.readyState >= 2) {
    lastVideoTime = video.currentTime;
    const detectionData = dualVisionEngine.detect(video, now);
    game.update(detectionData);

    const poses = detectionData?.poseResult?.landmarks || [];
    const hands = detectionData?.handResult?.landmarks || [];
    detectionEl.textContent = `人體: ${poses.length} · 雙手: ${hands.length}`;
  }

  renderer.render(game, now);
  timeLeftText.textContent = `${game.timeLeft}s`;

  if (game.phase === 'PLAYING') {
    gamePhaseText.textContent = `討伐中 · HP ${game.boss.hp}`;
  } else if (game.result === 'VICTORY') {
    gamePhaseText.textContent = '👑 討伐大成功！';
  } else {
    gamePhaseText.textContent = '⏰ 時間到！';
  }

  updateFps();
  requestAnimationFrame(renderLoop);
}

async function start() {
  if (running) return;
  dualSound.playClick();
  startButton.disabled = true;
  emptyStartBtn.disabled = true;
  statusEl.textContent = '準備啟動雙人模式…';
  statusDot.className = 'dot';

  try {
    await dualVisionEngine.init((msg) => {
      statusEl.textContent = msg;
    });

    statusEl.textContent = '載入雙人與怪物素材…';
    await renderer.assetsReady;

    statusEl.textContent = '請求攝影機權限…';
    await camera.start();

    statusEl.textContent = '初始化雙人戰鬥場景…';
    renderer.resize(stage);
    game.init(stage.clientWidth, stage.clientHeight);

    running = true;
    emptyState.hidden = true;
    stopButton.disabled = false;
    restartButton.disabled = false;
    statusEl.textContent = '雙人戰鬥進行中';
    statusDot.className = 'dot active';

    requestAnimationFrame(renderLoop);
  } catch (err) {
    console.error('啟動失敗:', err);
    statusEl.textContent = '啟動失敗';
    startButton.disabled = false;
    emptyStartBtn.disabled = false;
    alert(`無法啟動攝影機：\n${err.message}\n\n請確認瀏覽器允許攝影機權限！`);
  }
}

function stop() {
  dualSound.playClick();
  running = false;
  camera.stop();
  renderer.clear(stage.clientWidth, stage.clientHeight);
  emptyState.hidden = false;
  startButton.disabled = false;
  emptyStartBtn.disabled = false;
  stopButton.disabled = true;
  restartButton.disabled = true;
  statusEl.textContent = '已停止';
  statusDot.className = 'dot';
  fpsEl.textContent = '—';
  detectionEl.textContent = '—';
  gamePhaseText.textContent = '已停止';
}

startButton.addEventListener('click', start);
emptyStartBtn.addEventListener('click', start);
stopButton.addEventListener('click', stop);
restartButton.addEventListener('click', () => {
  dualSound.playClick();
  game.restart();
});

// 音效開關
soundToggle.addEventListener('click', () => {
  dualSound.enabled = !dualSound.enabled;
  soundToggle.textContent = dualSound.enabled ? '🔊 音效' : '🔇 靜音';
  dualSound.playClick();
});

// 滿版切換
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await stage.requestFullscreen();
    }
    dualSound.playClick();
  } catch (e) {
    console.warn('滿版失敗:', e);
  }
}
fullscreenToggle.addEventListener('click', toggleFullscreen);

window.addEventListener('resize', resizeGameStage);
