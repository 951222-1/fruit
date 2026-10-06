import { FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';

const POSE_MODEL_URL = '/models/pose_landmarker_lite.task';
const HAND_MODEL_URL = '/models/hand_landmarker.task';
const WASM_URL = '/wasm'; // 100% 本地載入，免依賴外部 CDN

export class VisionEngine {
  constructor() {
    this.vision = null;
    this.poseLandmarker = null;
    this.handLandmarker = null;
    this.isLoading = false;
  }

  async init(onProgress = () => {}) {
    if (this.poseLandmarker && this.handLandmarker) return;
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      onProgress('載入 WASM 核心…');
      this.vision = await FilesetResolver.forVisionTasks(WASM_URL);

      onProgress('載入人體姿勢模型…');
      this.poseLandmarker = await this.createModel(
        PoseLandmarker,
        POSE_MODEL_URL,
        { numPoses: 1, minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5 }
      );

      onProgress('載入雙手手勢模型…');
      this.handLandmarker = await this.createModel(
        HandLandmarker,
        HAND_MODEL_URL,
        { numHands: 2, minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5 }
      );

      onProgress('模型載入完成！');
    } catch (err) {
      console.error('VisionEngine init error:', err);
      throw err;
    } finally {
      this.isLoading = false;
    }
  }

  async createModel(ModelClass, modelUrl, extraOptions) {
    // 優先使用 GPU，若環境不支援自動降級至 CPU
    try {
      return await ModelClass.createFromOptions(this.vision, {
        baseOptions: { modelAssetPath: modelUrl, delegate: 'GPU' },
        runningMode: 'VIDEO',
        ...extraOptions,
      });
    } catch (gpuErr) {
      console.warn(`GPU delegate 失敗，降級使用 CPU 載入 ${modelUrl}:`, gpuErr);
      return await ModelClass.createFromOptions(this.vision, {
        baseOptions: { modelAssetPath: modelUrl, delegate: 'CPU' },
        runningMode: 'VIDEO',
        ...extraOptions,
      });
    }
  }

  detect(video, timestamp) {
    let poseResult = null;
    let handResult = null;

    if (this.poseLandmarker) {
      try {
        poseResult = this.poseLandmarker.detectForVideo(video, timestamp);
      } catch (e) {
        // ignore single frame detection failure
      }
    }

    if (this.handLandmarker) {
      try {
        handResult = this.handLandmarker.detectForVideo(video, timestamp);
      } catch (e) {
        // ignore single frame detection failure
      }
    }

    return { poseResult, handResult };
  }
}

export const visionEngine = new VisionEngine();
