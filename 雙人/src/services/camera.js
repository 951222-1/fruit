export class CameraManager {
  constructor(videoElement) {
    this.video = videoElement;
    this.stream = null;
  }

  async start() {
    if (this.stream) return;

    const constraintsList = [
      { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } },
      { video: { width: { ideal: 960 }, height: { ideal: 540 }, facingMode: 'user' } },
      { video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } },
      { video: true }
    ];

    let lastError = null;
    for (const constraints of constraintsList) {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.video.srcObject = this.stream;
        await this.waitForVideoReady(this.video);
        return;
      } catch (err) {
        lastError = err;
        console.warn('相機解析度嘗試失敗，降級重試:', constraints, err);
      }
    }
    throw lastError || new Error('無法開啟攝影機');
  }

  waitForVideoReady(video, timeoutMs = 4000) {
    return new Promise((resolve) => {
      if (video.readyState >= 1 && video.videoWidth > 0) {
        video.play().then(resolve).catch(resolve);
        return;
      }

      let timer = null;
      const onLoaded = () => {
        cleanup();
        video.play().then(resolve).catch(resolve);
      };

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('canplay', onLoaded);
      };

      timer = setTimeout(() => {
        cleanup();
        video.play().then(resolve).catch(resolve);
      }, timeoutMs);

      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('canplay', onLoaded);
    });
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.video.srcObject = null;
  }
}
