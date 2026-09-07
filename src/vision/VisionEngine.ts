import { VisionEngineInterface, HandTracking, TrackingPoint } from '../types';
import { VectorFilter } from '../utils/smoothing';
import { StabilityFilter } from '../utils/stability';

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
  private leftStability = new StabilityFilter();
  private rightStability = new StabilityFilter();
  private lastResults: MediaPipeResults | null = null;
  private rafId: number | null = null;
  private onResultsCallback?: (results: MediaPipeResults) => void;
  private calibrationData: any = null;

  private leftHistory: HistoryEntry[] = [];
  private rightHistory: HistoryEntry[] = [];
  private leftPrevVel = { x: 0, y: 0, z: 0 };
  private rightPrevVel = { x: 0, y: 0, z: 0 };

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    console.log('[VisionEngine] Loading MediaPipe for stable tracking...');
    
    try {
      const { HandLandmarker, PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );

      let delegate: 'GPU' | 'CPU' = 'GPU';
      try {
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.45,
          minHandPresenceConfidence: 0.45,
          minTrackingConfidence: 0.45
        });
      } catch {
        delegate = 'CPU';
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.45,
          minHandPresenceConfidence: 0.45,
          minTrackingConfidence: 0.45
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
          minPoseDetectionConfidence: 0.45,
          minPosePresenceConfidence: 0.45,
          minTrackingConfidence: 0.45
        });
      } catch {}

      this.isInitialized = true;
      console.log('[VisionEngine] Stable tracking ready -', delegate);
    } catch (e) {
      console.warn('[VisionEngine] Fallback', e);
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
    this.leftStability.clear();
    this.rightStability.clear();
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
      } catch {}

      this.rafId = requestAnimationFrame(detect);
    };

    detect();
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
      if (pose[11]?.visibility > 0.35) leftShoulder = { x: pose[11].x, y: pose[11].y, z: pose[11].z ?? 0, visibility: pose[11].visibility };
      if (pose[12]?.visibility > 0.35) rightShoulder = { x: pose[12].x, y: pose[12].y, z: pose[12].z ?? 0, visibility: pose[12].visibility };
      if (pose[13]?.visibility > 0.35) leftElbow = { x: pose[13].x, y: pose[13].y, z: pose[13].z ?? 0, visibility: pose[13].visibility };
      if (pose[14]?.visibility > 0.35) rightElbow = { x: pose[14].x, y: pose[14].y, z: pose[14].z ?? 0, visibility: pose[14].visibility };
      if (pose[15]?.visibility > 0.35) poseLeftWrist = { x: pose[15].x, y: pose[15].y, z: pose[15].z ?? 0, visibility: pose[15].visibility };
      if (pose[16]?.visibility > 0.35) poseRightWrist = { x: pose[16].x, y: pose[16].y, z: pose[16].z ?? 0, visibility: pose[16].visibility };

      result.debug!.leftShoulder = leftShoulder;
      result.debug!.rightShoulder = rightShoulder;
      result.debug!.leftWrist = poseLeftWrist;
      result.debug!.rightWrist = poseRightWrist;
    }

    const detectedHands = new Map<string, any>();

    if (handResults?.landmarks) {
      for (let i = 0; i < handResults.landmarks.length; i++) {
        const landmarks = handResults.landmarks[i];
        const handedness = handResults.handednesses?.[i]?.[0]?.categoryName?.toLowerCase() || '';
        const isLeft = handedness.includes('left');
        const key = isLeft ? 'left' : 'right';
        const wrist = landmarks[0];
        if (!wrist) continue;
        const conf = handResults.handednesses?.[i]?.[0]?.score ?? 0.8;
        if (conf < 0.4) continue; // stability: ignore low confidence
        detectedHands.set(key, { landmarks, wrist, confidence: conf, source: 'hand' });
      }
    }

    // Pose fallback - more stable for air punches
    if (!detectedHands.has('left') && poseLeftWrist && (poseLeftWrist.visibility ?? 0) > 0.4) {
      detectedHands.set('left', { 
        landmarks: [], 
        wrist: poseLeftWrist, 
        confidence: poseLeftWrist.visibility ?? 0.6,
        source: 'pose'
      });
    }
    if (!detectedHands.has('right') && poseRightWrist && (poseRightWrist.visibility ?? 0) > 0.4) {
      detectedHands.set('right', { 
        landmarks: [], 
        wrist: poseRightWrist, 
        confidence: poseRightWrist.visibility ?? 0.6,
        source: 'pose'
      });
    }

    for (const [handKey, data] of detectedHands) {
      const isLeft = handKey === 'left';
      const wrist = data.wrist;
      
      // Stability filtering
      const stability = isLeft ? this.leftStability : this.rightStability;
      const stable = stability.update(wrist, timestamp);
      
      // Ignore micro jitter < 8mm
      if (stable.movement < 0.006 && stable.isStable) {
        // Keep last velocity as 0 for stable guard position
        const trackingStable: HandTracking = {
          hand: handKey as any,
          wrist: { x: stable.filteredPos.x, y: stable.filteredPos.y, z: stable.filteredPos.z },
          elbow: isLeft ? leftElbow : rightElbow,
          shoulder: isLeft ? leftShoulder : rightShoulder,
          landmarks: data.landmarks?.map((l: any) => ({ x: l.x, y: l.y, z: l.z ?? 0, visibility: 1 })) || [],
          velocity: { x: 0, y: 0, z: 0 },
          acceleration: { x: 0, y: 0, z: 0 },
          extension: this.calculateExtension(stable.filteredPos, isLeft ? leftShoulder : rightShoulder),
          state: 'READY',
          confidence: data.confidence * 0.9, // slightly reduce for stable
        };
        if (isLeft) result.leftHand = trackingStable;
        else result.rightHand = trackingStable;
        continue;
      }

      // History for velocity
      const history = isLeft ? this.leftHistory : this.rightHistory;
      history.push({ x: stable.filteredPos.x, y: stable.filteredPos.y, z: stable.filteredPos.z, t: timestamp });
      if (history.length > 12) history.shift();

      // Calculate velocity with smoothing over 120ms window
      let velocity = { x: 0, y: 0, z: 0 };
      if (history.length >= 3) {
        const windowMs = 120;
        const recent = history.filter(h => timestamp - h.t <= windowMs);
        if (recent.length >= 2) {
          const first = recent[0];
          const last = recent[recent.length - 1];
          const dt = (last.t - first.t) / 1000;
          if (dt > 0.02) {
            velocity = {
              x: (last.x - first.x) / dt,
              y: (last.y - first.y) / dt,
              z: (last.z - first.z) / dt,
            };
          }
        }
      }

      // Acceleration
      const prevVel = isLeft ? this.leftPrevVel : this.rightPrevVel;
      const dt = 0.033;
      const acceleration = {
        x: (velocity.x - prevVel.x) / dt,
        y: (velocity.y - prevVel.y) / dt,
        z: (velocity.z - prevVel.z) / dt,
      };

      if (isLeft) this.leftPrevVel = velocity;
      else this.rightPrevVel = velocity;

      // One Euro filter for final smoothing
      const filtered = isLeft ? this.leftFilter.filter(stable.filteredPos, timestamp/1000) : this.rightFilter.filter(stable.filteredPos, timestamp/1000);

      const tracking: HandTracking = {
        hand: handKey as any,
        wrist: { x: filtered.x, y: filtered.y, z: (filtered as any).z ?? stable.filteredPos.z },
        elbow: isLeft ? leftElbow : rightElbow,
        shoulder: isLeft ? leftShoulder : rightShoulder,
        landmarks: data.landmarks?.map((l: any) => ({ x: l.x, y: l.y, z: l.z ?? 0, visibility: 1 })) || [],
        velocity,
        acceleration,
        extension: this.calculateExtension(stable.filteredPos, isLeft ? leftShoulder : rightShoulder),
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
    this.leftStability.clear();
    this.rightStability.clear();
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
