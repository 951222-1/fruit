// 攝影機串流生命週期管理
export class CameraManager {
  constructor(videoElement) {
    this.video = videoElement;
    this.stream = null;
    this.running = false;
  }

  async start(options = {}) {
    if (this.running) return;

    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
        ...options,
      });
    } catch (err) {
      console.warn('指定解析度失敗，嘗試預設攝影機配置:', err);
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }

    this.stream = stream;
    this.video.srcObject = this.stream;

    // 安全等待 metadata，避免 promise 永久掛起
    await new Promise((resolve) => {
      if (this.video.readyState >= 1) {
        resolve();
      } else {
        const onLoaded = () => {
          this.video.removeEventListener('loadedmetadata', onLoaded);
          resolve();
        };
        this.video.addEventListener('loadedmetadata', onLoaded);
        // 3 秒超時保護
        setTimeout(resolve, 3000);
      }
    });

    try {
      await this.video.play();
    } catch (playErr) {
      console.warn('video.play() 異常，重新嘗試:', playErr);
    }

    this.running = true;
  }

  stop() {
    this.running = false;
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  isReady() {
    return this.running && this.video.readyState >= 2;
  }

  getDimensions() {
    return {
      videoWidth: this.video.videoWidth || 640,
      videoHeight: this.video.videoHeight || 480,
    };
  }
}
