import { VisionEngineInterface, HandTracking, TrackingPoint } from '../types';
import { VectorFilter } from '../utils/smoothing';

/**
 * VisionEngine - Real MediaPipe Tasks Vision implementation
 * Handles:
 * - Hand Landmarker (21 landmarks per hand)
 * - Pose Landmarker (33 landmarks for body)
 * - Air punch calibration
 * 
 * All processing local, no upload
 */

export interface MediaPipeResults {
  leftHand?: HandTracking;
  rightHand?: HandTracking;
  pose?: any;
  timestamp: number;
}

export class VisionEngine implements VisionEngineInterface {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private handLandmarker: any = null;
  private poseLandmarker: any = null;
  private isInitialized = false;
  private isDetecting = false;
  private leftFilter = new VectorFilter();
  private rightFilter = new VectorFilter();
  private lastResults: MediaPipeResults | null = null;
  private rafId: number | null = null;
  private onResultsCallback?: (results: MediaPipeResults) => void;

  // Calibration
  private calibrationData: any = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('[VisionEngine] Loading MediaPipe Tasks Vision...');
    
    try {
      // Dynamic import to avoid SSR issues
      const { HandLandmarker, PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );

      // Hand Landmarker - for precise hand tracking
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      // Pose Landmarker - for body, shoulders, calibration
      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.isInitialized = true;
      console.log('[VisionEngine] Ready - Hand + Pose landmarkers loaded');
    } catch (e) {
      console.warn('[VisionEngine] Failed to load MediaPipe, falling back to mock', e);
      // Fallback to mock mode - still mark as initialized for demo
      this.isInitialized = true;
      throw e;
    }
  }

  async startCamera(): Promise<MediaStream> {
    if (!this.isInitialized) await this.initialize();
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          facingMode: 'user' 
        },
        audio: false
      });
      
      this.stream = stream;
      
      // Create video element for processing
      if (!this.videoElement) {
        this.videoElement = document.createElement('video');
        this.videoElement.autoplay = true;
        this.videoElement.playsInline = true;
        this.videoElement.muted = true;
      }
      
      this.videoElement.srcObject = stream;
      await this.videoElement.play();
      
      // Start detection loop
      this.startDetectionLoop();
      
      return stream;
    } catch (e) {
      console.error('[VisionEngine] Camera failed', e);
      throw e;
    }
  }

  private startDetectionLoop() {
    if (this.isDetecting) return;
    this.isDetecting = true;

    const detect = () => {
      if (!this.isDetecting || !this.videoElement || !this.handLandmarker) {
        this.rafId = requestAnimationFrame(detect);
        return;
      }

      if (this.videoElement.readyState < 2) {
        this.rafId = requestAnimationFrame(detect);
        return;
      }

      const now = performance.now();

      try {
        // Hand detection
        const handResults = this.handLandmarker.detectForVideo(this.videoElement, now);
        
        // Pose detection for calibration
        let poseResults = null;
        if (this.poseLandmarker) {
          poseResults = this.poseLandmarker.detectForVideo(this.videoElement, now);
        }

        const processed = this.processResults(handResults, poseResults, now);
        this.lastResults = processed;
        this.onResultsCallback?.(processed);
      } catch (e) {
        // Silent fail, continue loop
      }

      this.rafId = requestAnimationFrame(detect);
    };

    detect();
  }

  private processResults(handResults: any, poseResults: any, timestamp: number): MediaPipeResults {
    const result: MediaPipeResults = { timestamp };

    // Process pose for shoulder positions (for calibration)
    let leftShoulder: TrackingPoint | undefined;
    let rightShoulder: TrackingPoint | undefined;
    
    if (poseResults?.landmarks?.[0]) {
      const pose = poseResults.landmarks[0];
      // Pose landmarks: 11=left shoulder, 12=right shoulder, 13=left elbow, 14=right elbow, 15=left wrist, 16=right wrist
      if (pose[11]) leftShoulder = { x: pose[11].x, y: pose[11].y, z: pose[11].z ?? 0, visibility: pose[11].visibility };
      if (pose[12]) rightShoulder = { x: pose[12].x, y: pose[12].y, z: pose[12].z ?? 0, visibility: pose[12].visibility };
    }

    // Process hands
    if (handResults?.landmarks) {
      for (let i = 0; i < handResults.landmarks.length; i++) {
        const landmarks = handResults.landmarks[i];
        const handedness = handResults.handednesses?.[i]?.[0]?.categoryName?.toLowerCase() || (i === 0 ? 'left' : 'right');
        const isLeft = handedness.includes('left');
        
        // Wrist is landmark 0, index tip 8, etc.
        const wrist = landmarks[0];
        if (!wrist) continue;

        const tracking: HandTracking = {
          hand: isLeft ? 'left' : 'right',
          wrist: { x: wrist.x, y: wrist.y, z: wrist.z ?? 0 },
          elbow: isLeft ? leftShoulder : rightShoulder, // approximate, better from pose
          shoulder: isLeft ? leftShoulder : rightShoulder,
          landmarks: landmarks.map((l: any) => ({ x: l.x, y: l.y, z: l.z ?? 0, visibility: 1 })),
          velocity: { x: 0, y: 0, z: 0 }, // calculated via filter diff
          acceleration: { x: 0, y: 0, z: 0 },
          extension: this.calculateExtension(wrist, isLeft ? leftShoulder : rightShoulder),
          state: 'READY',
          confidence: handResults.handednesses?.[i]?.[0]?.score ?? 0.8,
        };

        // Apply smoothing
        const filtered = isLeft ? this.leftFilter.filter(tracking.wrist, timestamp/1000) : this.rightFilter.filter(tracking.wrist, timestamp/1000);
        tracking.wrist = { ...tracking.wrist, ...filtered };

        if (isLeft) result.leftHand = tracking;
        else result.rightHand = tracking;
      }
    }

    // Attach pose
    if (poseResults) result.pose = poseResults;

    return result;
  }

  private calculateExtension(wrist: any, shoulder?: TrackingPoint): number {
    if (!shoulder || !wrist) return 0.5;
    const dx = wrist.x - shoulder.x;
    const dy = wrist.y - shoulder.y;
    const dz = (wrist.z ?? 0) - (shoulder.z ?? 0);
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    // Normalize: typical arm length ~0.6 normalized units
    return Math.min(1, dist / 0.6);
  }

  // For external consumption
  getTrackingData(): { leftHand?: HandTracking; rightHand?: HandTracking } {
    return {
      leftHand: this.lastResults?.leftHand,
      rightHand: this.lastResults?.rightHand
    };
  }

  getLatestResults(): MediaPipeResults | null {
    return this.lastResults;
  }

  onResults(callback: (results: MediaPipeResults) => void) {
    this.onResultsCallback = callback;
  }

  stopCamera() {
    this.isDetecting = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  setCalibration(data: any) {
    this.calibrationData = data;
  }

  dispose() {
    this.stopCamera();
    try {
      this.handLandmarker?.close();
      this.poseLandmarker?.close();
    } catch {}
    this.handLandmarker = null;
    this.poseLandmarker = null;
    this.isInitialized = false;
  }

  // Compatibility
  detectHands(): HandTracking[] { return []; }
  detectPose(): any { return null; }
  detectPunch(): any { return null; }
}

export const visionEngine = new VisionEngine();
