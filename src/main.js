import { sound } from './services/audio.js';
import { CameraManager } from './services/camera.js';
import { visionEngine } from './services/vision.js';
import { GameRenderer } from './render/gameRenderer.js';
import { SlingshotGame } from './game/slingshotGame.js';
import './style.css';

const app = document.querySelector('#app');
app.innerHTML = `
  <main class="shell">
    <header class="hero">
      <div class="title-wrap">
        <h1>體感彈弓射水果 🏹</h1>
        <p>1 分鐘限時挑戰！雙手併攏舉高過肩，往下拉弓後續力 3 秒自動發射！</p>
      </div>
      <div class="hero-actions">
        <button class="secondary" id="soundToggle">🔊 音效</button>
        <div class="badge"><span class="dot" id="statusDot"></span><span id="status">尚未啟動</span></div>
      </div>
    </header>

    <section class="stage-card">
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
          <h2>準備開始 1 分鐘彈弓射水果</h2>
          <p>請點擊下方「啟動 Webcam」允許攝影機權限，讓上半身與雙手進入畫面，即可開始動作校準與挑戰！</p>
          <button class="primary" id="emptyStartBtn" style="margin-top: 16px; padding: 12px 24px; font-size: 16px;">立即啟動 Webcam 🎥</button>
        </div>
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
const emptyState = document.querySelector('#emptyState');
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

let running = false;
let lastVideoTime = -1;
let frameCount = 0;
let lastFpsUpdate = performance.now();

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

    // 清理畫布
    renderer.clear(width, height);

    // 繪製微光骨架輔助
    if (poseResult?.landmarks?.[0]) {
      renderer.drawSkeleton(poseResult.landmarks[0], width, height);
    }

    // 遊戲物理與介面更新
    game.update({ handResult, poseResult }, renderer, width, height);

    // 更新狀態列文字與按鈕
    const isCalibrating = game.phase === 'CALIBRATION';
    skipTutorialBtn.style.display = isCalibrating ? 'inline-flex' : 'none';

    if (game.phase === 'CALIBRATION') {
      gamePhaseText.textContent = `動作校準 (${game.tutorialStep}/3)`;
    } else if (game.phase === 'PLAYING') {
      gamePhaseText.textContent = `挑戰中 ⏱️ ${game.timeLeft}s`;
    } else if (game.phase === 'FINISHED') {
      gamePhaseText.textContent = `時間到！得分: ${game.score}`;
    }

    const detected = (poseResult?.landmarks?.[0] || handResult?.landmarks?.length);
    detectionEl.textContent = detected ? '正常' : '未入鏡';
    updateFps();
  }

  requestAnimationFrame(renderLoop);
}

async function start() {
  if (running) return;
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

    statusEl.textContent = '請求攝影機權限…';
    await camera.start();

    statusEl.textContent = '初始化畫布…';
    renderer.resize(stage);
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
