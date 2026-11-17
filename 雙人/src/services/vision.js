import { FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';

const POSE_MODEL_URL = 'models/pose_landmarker_lite.task';
const HAND_MODEL_URL = 'models/hand_landmarker.task';
const WASM_URL = 'wasm';

export class DualVisionEngine {
  constructor() {
    this.vision = null;
    this.poseLandmarker = null;
    this.handLandmarker = null;
    this.isLoading = false;
    this.segmentationAvailable = false;
  }

  async init(onProgress = () => {}) {
    if (this.poseLandmarker && this.handLandmarker) return;
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      onProgress('載入 WASM 視覺引擎…');
      this.vision = await FilesetResolver.forVisionTasks(WASM_URL);

      onProgress('載入雙人姿勢模型 (2人)…');
      const poseOptions = {
        numPoses: 2,
        minPoseDetectionConfidence: 0.45,
        minPosePresenceConfidence: 0.45,
        minTrackingConfidence: 0.45,
      };

      try {
        this.poseLandmarker = await this.createModel(
          PoseLandmarker,
          POSE_MODEL_URL,
          { ...poseOptions, outputSegmentationMasks: true }
        );
        this.segmentationAvailable = true;
      } catch (segmentationError) {
        console.warn('人物去背遮罩不支援，改用骨架模式：', segmentationError);
        this.poseLandmarker = await this.createModel(PoseLandmarker, POSE_MODEL_URL, poseOptions);
        this.segmentationAvailable = false;
      }

      onProgress('載入雙人手勢模型 (4隻手)…');
      this.handLandmarker = await this.createModel(
        HandLandmarker,
        HAND_MODEL_URL,
        { numHands: 4, minHandDetectionConfidence: 0.45, minHandPresenceConfidence: 0.45, minTrackingConfidence: 0.45 }
      );

      onProgress('雙人模型載入完成！');
    } catch (err) {
      console.error('DualVisionEngine init error:', err);
      throw err;
    } finally {
      this.isLoading = false;
    }
  }

  async createModel(ModelClass, modelUrl, extraOptions) {
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
        // ignore frame drop
      }
    }

    if (this.handLandmarker) {
      try {
        handResult = this.handLandmarker.detectForVideo(video, timestamp);
      } catch (e) {
        // ignore frame drop
      }
    }

    return { poseResult, handResult };
  }
}

export const dualVisionEngine = new DualVisionEngine();
