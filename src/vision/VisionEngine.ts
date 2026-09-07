import { VisionEngineInterface, HandTracking } from '../types';
import { VectorFilter } from '../utils/smoothing';

/**
 * VisionEngine abstraction.
 * Current: placeholder that simulates MediaPipe pipeline.
 * Future: integrates @mediapipe/tasks-vision HandLandmarker + PoseLandmarker
 * All processing stays local.
 */

export class VisionEngine implements VisionEngineInterface {
  private stream: MediaStream | null = null;
  private isInitialized = false;
  private leftFilter = new VectorFilter();
  private rightFilter = new VectorFilter();

  // Mock tracking data for demo fallback
  private mockLeft: HandTracking | null = null;
  private mockRight: HandTracking | null = null;

  async initialize(): Promise<void> {
    // In real implementation:
    // - Load MediaPipe Tasks Vision wasm
    // - Create HandLandmarker and PoseLandmarker
    // - Warmup
    console.log('[VisionEngine] Initializing...');
    await new Promise(r => setTimeout(r, 600));
    this.isInitialized = true;
    console.log('[VisionEngine] Ready (mock mode)');
  }

  async startCamera(): Promise<MediaStream> {
    if (!this.isInitialized) await this.initialize();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
      });
      this.stream = stream;
      return stream;
    } catch (e) {
      console.warn('[VisionEngine] Camera unavailable, using mock', e);
      throw e;
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }

  // In real engine, this would process video frame -> landmarks
  getTrackingData(): { leftHand?: HandTracking; rightHand?: HandTracking } {
    return {
      leftHand: this.mockLeft ?? undefined,
      rightHand: this.mockRight ?? undefined
    };
  }

  // Future: full detection pipeline
  detectHands(): HandTracking[] { return []; }
  detectPose(): any { return null; }
  detectPunch(): any { return null; }

  dispose() {
    this.stopCamera();
    this.isInitialized = false;
  }

  // For mock injection
  injectMockTracking(left?: HandTracking, right?: HandTracking) {
    this.mockLeft = left ?? null;
    this.mockRight = right ?? null;
  }
}

export const visionEngine = new VisionEngine();
