import { VisionEngineInterface, HandTracking, TrackingPoint } from '../types';
import { VectorFilter } from '../utils/smoothing';

export interface MediaPipeResults {
  leftHand?: HandTracking;
  rightHand?: HandTracking;
  pose?: any;
  timestamp: number;
  debug?: {
    leftWrist?: TrackingPoint;
    rightWrist?: TrackingPoint;
    leftShoulder?: TrackingPoint;
    rightShoulder?: TrackingPoint;
  }
}

interface HistoryEntry {
  x: number;
  y: number;
  z: number;
  t: number;
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
  private calibrationData: any = null;

  // Velocity tracking
  private leftHistory: HistoryEntry[] = [];
  private rightHistory: HistoryEntry[] = [];
  private leftPrevVel = { x: 0, y: 0, z: 0 };
  private rightPrevVel = { x: 0, y: 0, z: 0 };

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    console.log('[VisionEngine] Loading MediaPipe...');
    
    try {
      const { HandLandmarker, PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );

      // Try GPU first, fallback to CPU
      let delegate: 'GPU' | 'CPU' = 'GPU';
      try {
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.4,
          minHandPresenceConfidence: 0.4,
          minTrackingConfidence: 0.4
        });
      } catch (gpuErr) {
        console.warn('[VisionEngine] GPU failed, trying CPU', gpuErr);
        delegate = 'CPU';
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.4,
          minHandPresenceConfidence: 0.4,
          minTrackingConfidence: 0.4
        });
      }

      try {
        this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.4,
          minPosePresenceConfidence: 0.4,
          minTrackingConfidence: 0.4
        });
      } catch (e) {
        console.warn('[VisionEngine] Pose landmarker failed', e);
      }

      this.isInitialized = true;
      console.log('[VisionEngine] Ready - delegate:', delegate);
    } catch (e) {
      console.warn('[VisionEngine] MediaPipe load failed, mock mode', e);
      this.isInitialized = true;
      throw e;
    }
  }

  async startCamera(): Promise<MediaStream> {
    if (!this.isInitialized) await this.initialize();
    
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
    
    if (!this.videoElement) {
      this.videoElement = document.createElement('video');
      this.videoElement.autoplay = true;
      this.videoElement.playsInline = true;
      this.videoElement.muted = true;
    }
    
    this.videoElement.srcObject = stream;
    await this.videoElement.play();
    
    this.leftHistory = [];
    this.rightHistory = [];
    this.startDetectionLoop();
    
    return stream;
  }

  private startDetectionLoop() {
    if (this.isDetecting) return;
    this.isDetecting = true;

    const detect = () => {
      if (!this.isDetecting || !this.videoElement) {
        this.rafId = requestAnimationFrame(detect);
        return;
      }

      if (this.videoElement.readyState < 2) {
        this.rafId = requestAnimationFrame(detect);
        return;
      }

      const now = performance.now();

      try {
        let handResults = null;
        let poseResults = null;

        if (this.handLandmarker) {
          handResults = this.handLandmarker.detectForVideo(this.videoElement, now);
        }
        
        if (this.poseLandmarker) {
          poseResults = this.poseLandmarker.detectForVideo(this.videoElement, now);
        }

        const processed = this.processResults(handResults, poseResults, now);
        this.lastResults = processed;
        this.onResultsCallback?.(processed);
      } catch (e) {
        // continue
      }

      this.rafId = requestAnimationFrame(detect);
    };

    detect();
  }

  private calculateVelocity(history: HistoryEntry[], current: {x:number,y:number,z:number}, now: number) {
    // Keep last 5 entries within 200ms
    const recent = history.filter(h => now - h.t < 250);
    if (recent.length < 2) {
      return { x: 0, y: 0, z: 0 };
    }
    const oldest = recent[0];
    const newest = recent[recent.length - 1];
    const dt = (newest.t - oldest.t) / 1000; // seconds
    if (dt < 0.01) return { x: 0, y: 0, z: 0 };
    
    return {
      x: (newest.x - oldest.x) / dt,
      y: (newest.y - oldest.y) / dt,
      z: (newest.z - oldest.z) / dt,
    };
  }

  private processResults(handResults: any, poseResults: any, timestamp: number): MediaPipeResults {
    const result: MediaPipeResults = { timestamp, debug: {} };

    let leftShoulder: TrackingPoint | undefined;
    let rightShoulder: TrackingPoint | undefined;
    let leftElbow: TrackingPoint | undefined;
    let rightElbow: TrackingPoint | undefined;
    let poseLeftWrist: TrackingPoint | undefined;
    let poseRightWrist: TrackingPoint | undefined;
    
    if (poseResults?.landmarks?.[0]) {
      const pose = poseResults.landmarks[0];
      // 11:left shoulder, 12:right shoulder, 13:left elbow, 14:right elbow, 15:left wrist, 16:right wrist
      if (pose[11]?.visibility > 0.3) leftShoulder = { x: pose[11].x, y: pose[11].y, z: pose[11].z ?? 0, visibility: pose[11].visibility };
      if (pose[12]?.visibility > 0.3) rightShoulder = { x: pose[12].x, y: pose[12].y, z: pose[12].z ?? 0, visibility: pose[12].visibility };
      if (pose[13]?.visibility > 0.3) leftElbow = { x: pose[13].x, y: pose[13].y, z: pose[13].z ?? 0, visibility: pose[13].visibility };
      if (pose[14]?.visibility > 0.3) rightElbow = { x: pose[14].x, y: pose[14].y, z: pose[14].z ?? 0, visibility: pose[14].visibility };
      if (pose[15]?.visibility > 0.3) poseLeftWrist = { x: pose[15].x, y: pose[15].y, z: pose[15].z ?? 0, visibility: pose[15].visibility };
      if (pose[16]?.visibility > 0.3) poseRightWrist = { x: pose[16].x, y: pose[16].y, z: pose[16].z ?? 0, visibility: pose[16].visibility };

      result.debug!.leftShoulder = leftShoulder;
      result.debug!.rightShoulder = rightShoulder;
      result.debug!.leftWrist = poseLeftWrist;
      result.debug!.rightWrist = poseRightWrist;
    }

    // Process hands from HandLandmarker
    const detectedHands = new Map<string, any>();

    if (handResults?.landmarks) {
      for (let i = 0; i < handResults.landmarks.length; i++) {
        const landmarks = handResults.landmarks[i];
        const handedness = handResults.handednesses?.[i]?.[0]?.categoryName?.toLowerCase() || '';
        const isLeft = handedness.includes('left');
        const key = isLeft ? 'left' : 'right';
        const wrist = landmarks[0];
        if (!wrist) continue;
        detectedHands.set(key, { landmarks, wrist, confidence: handResults.handednesses?.[i]?.[0]?.score ?? 0.8, source: 'hand' });
      }
    }

    // Fallback to pose wrists if hand not detected (crucial for air punches)
    if (!detectedHands.has('left') && poseLeftWrist) {
      detectedHands.set('left', { 
        landmarks: [], 
        wrist: poseLeftWrist, 
        confidence: poseLeftWrist.visibility ?? 0.6,
        source: 'pose'
      });
    }
    if (!detectedHands.has('right') && poseRightWrist) {
      detectedHands.set('right', { 
        landmarks: [], 
        wrist: poseRightWrist, 
        confidence: poseRightWrist.visibility ?? 0.6,
        source: 'pose'
      });
    }

    // Build tracking objects with velocity
    for (const [handKey, data] of detectedHands) {
      const isLeft = handKey === 'left';
      const wrist = data.wrist;
      
      // Update history
      const history = isLeft ? this.leftHistory : this.rightHistory;
      history.push({ x: wrist.x, y: wrist.y, z: wrist.z ?? 0, t: timestamp });
      if (history.length > 10) history.shift();

      const velocity = this.calculateVelocity(history, wrist, timestamp);
      const prevVel = isLeft ? this.leftPrevVel : this.rightPrevVel;
      const dt = 0.033; // approx 30fps
      const acceleration = {
        x: (velocity.x - prevVel.x) / dt,
        y: (velocity.y - prevVel.y) / dt,
        z: (velocity.z - prevVel.z) / dt,
      };

      if (isLeft) this.leftPrevVel = velocity;
      else this.rightPrevVel = velocity;

      // Smoothing
      const filtered = isLeft ? this.leftFilter.filter(wrist, timestamp/1000) : this.rightFilter.filter(wrist, timestamp/1000);

      const tracking: HandTracking = {
        hand: handKey as any,
        wrist: { x: filtered.x, y: filtered.y, z: (filtered as any).z ?? wrist.z ?? 0 },
        elbow: isLeft ? leftElbow : rightElbow,
        shoulder: isLeft ? leftShoulder : rightShoulder,
        landmarks: data.landmarks?.map((l: any) => ({ x: l.x, y: l.y, z: l.z ?? 0, visibility: 1 })) || [],
        velocity,
        acceleration,
        extension: this.calculateExtension(wrist, isLeft ? leftShoulder : rightShoulder),
        state: 'READY',
        confidence: data.confidence,
      };

      if (isLeft) result.leftHand = tracking;
      else result.rightHand = tracking;
    }

    if (poseResults) result.pose = poseResults;

    return result;
  }

  private calculateExtension(wrist: any, shoulder?: TrackingPoint): number {
    if (!shoulder || !wrist) return 0.5;
    const dx = wrist.x - shoulder.x;
    const dy = wrist.y - shoulder.y;
    const dz = (wrist.z ?? 0) - (shoulder.z ?? 0);
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    // Typical arm length 0.5-0.7 normalized
    return Math.min(1.2, dist / 0.55);
  }

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
    this.leftHistory = [];
    this.rightHistory = [];
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

  detectHands(): HandTracking[] { return []; }
  detectPose(): any { return null; }
  detectPunch(): any { return null; }
}

export const visionEngine = new VisionEngine();
