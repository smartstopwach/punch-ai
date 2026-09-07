import { HandTracking, PunchEvent, PunchState, PunchType, Hand } from '../types';
import { OneEuroFilter } from '../utils/smoothing';
import { CalibrationData } from './CalibrationEngine';
import { PunchStabilityGate, MovingAverage } from '../utils/stability';

interface DetectorState {
  state: PunchState;
  startTime: number;
  startPos: { x: number; y: number; z: number };
  maxVelocity: number;
  extension: number;
  trajectory: { x: number; y: number; z: number }[];
  stabilityGate: PunchStabilityGate;
  velAvg: MovingAverage;
  extAvg: MovingAverage;
}

export class PunchDetector {
  private states: Map<Hand, DetectorState> = new Map();
  private filters: Map<Hand, OneEuroFilter> = new Map();
  private velocityThreshold = 0.18;
  private extensionThreshold = 0.45;
  private cooldownMs = 320;
  private lastPunchTime: Map<Hand, number> = new Map();
  private calibration: CalibrationData | null = null;

  constructor() {
    (['left','right'] as Hand[]).forEach(h => {
      this.states.set(h, this.createIdleState());
      this.filters.set(h, new OneEuroFilter(1.2, 0.015));
      this.lastPunchTime.set(h, 0);
    });
  }

  private createIdleState(): DetectorState {
    return {
      state: 'IDLE',
      startTime: 0,
      startPos: { x: 0, y: 0, z: 0 },
      maxVelocity: 0,
      extension: 0,
      trajectory: [],
      stabilityGate: new PunchStabilityGate(),
      velAvg: new MovingAverage(4),
      extAvg: new MovingAverage(5),
    };
  }

  setCalibration(data: CalibrationData | null) {
    this.calibration = data;
    if (data) {
      this.velocityThreshold = Math.max(0.15, data.velocityThreshold);
      this.extensionThreshold = Math.max(0.42, data.extensionThreshold);
      console.log('[PunchDetector] Stable calibrated:', {
        velocity: this.velocityThreshold,
        extension: this.extensionThreshold,
        accuracy: data.accuracy
      });
    }
  }

  getCalibration(): CalibrationData | null {
    return this.calibration;
  }

  /**
   * Ultra stable state machine:
   * Requires 3 consistent frames above threshold before triggering
   * Prevents jitter and false positives
   */
  update(tracking: HandTracking): PunchEvent | null {
    const hand = tracking.hand;
    const state = this.states.get(hand)!;
    const now = performance.now();
    const lastPunch = this.lastPunchTime.get(hand)!;

    if (now - lastPunch < this.cooldownMs && state.state !== 'RECOVERY') {
      return null;
    }

    // Confidence gate - ignore low confidence
    if (tracking.confidence < 0.38) {
      if (state.state !== 'IDLE') state.state = 'READY';
      return null;
    }

    const rawSpeed = Math.hypot(tracking.velocity.x, tracking.velocity.y, tracking.velocity.z ?? 0);
    const filteredSpeed = this.filters.get(hand)!.filter(rawSpeed, now/1000);
    const smoothedSpeed = state.velAvg.add(filteredSpeed);
    const smoothedExt = state.extAvg.add(tracking.extension);

    // Stability gate check
    const gate = state.stabilityGate.check(smoothedExt, smoothedSpeed, {
      extension: this.extensionThreshold,
      velocity: this.velocityThreshold
    });

    switch (state.state) {
      case 'IDLE':
        if (tracking.confidence > 0.45) {
          state.state = 'READY';
          state.startPos = { ...tracking.wrist, z: tracking.wrist.z ?? 0 };
          state.trajectory = [];
          state.stabilityGate.clear();
        }
        break;

      case 'READY':
        // Need consistent frames above threshold
        if (gate.shouldStart && gate.confidence > 0.55) {
          state.state = 'MOVING';
          state.startTime = now;
          state.maxVelocity = smoothedSpeed;
          state.trajectory = [{ x: tracking.wrist.x, y: tracking.wrist.y, z: tracking.wrist.z ?? 0 }];
        }
        break;

      case 'MOVING':
        state.maxVelocity = Math.max(state.maxVelocity, smoothedSpeed);
        state.trajectory.push({ x: tracking.wrist.x, y: tracking.wrist.y, z: tracking.wrist.z ?? 0 });
        
        if (gate.shouldExtend && gate.confidence > 0.6) {
          state.state = 'EXTENDING';
        } else if (smoothedSpeed < this.velocityThreshold * 0.25 && smoothedExt < this.extensionThreshold * 0.8) {
          // Return to ready only if clearly stopped and retracted
          state.state = 'READY';
          state.stabilityGate.clear();
        }
        if (now - state.startTime > 1000) {
          state.state = 'READY';
          state.stabilityGate.clear();
        }
        break;

      case 'EXTENDING':
        state.maxVelocity = Math.max(state.maxVelocity, smoothedSpeed);
        state.trajectory.push({ x: tracking.wrist.x, y: tracking.wrist.y, z: tracking.wrist.z ?? 0 });
        
        // Stable impact detection: need velocity drop OR max extension, with confidence
        if (gate.shouldImpact && gate.confidence > 0.65) {
          state.state = 'IMPACT';
          const punch = this.createPunchEvent(tracking, state, smoothedExt, smoothedSpeed);
          this.lastPunchTime.set(hand, now);
          state.state = 'RECOVERY';
          setTimeout(() => {
            const s = this.states.get(hand);
            if (s) {
              s.state = 'READY';
              s.stabilityGate.clear();
            }
          }, 180);
          return punch;
        }
        if (now - state.startTime > 700) {
          state.state = 'READY';
          state.stabilityGate.clear();
        }
        break;

      case 'RECOVERY':
        // Wait for stable rest position
        if (smoothedSpeed < this.velocityThreshold * 0.35 && smoothedExt < this.extensionThreshold) {
          state.state = 'READY';
          state.stabilityGate.clear();
        }
        if (now - state.startTime > 500) {
          state.state = 'READY';
        }
        break;
    }

    return null;
  }

  private createPunchEvent(tracking: HandTracking, state: DetectorState, smoothedExt: number, smoothedSpeed: number): PunchEvent {
    const type = this.classifyPunch(tracking);
    return {
      id: `${tracking.hand}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      hand: tracking.hand,
      type,
      timestamp: Date.now(),
      velocity: parseFloat((state.maxVelocity * 12).toFixed(1)),
      acceleration: parseFloat((state.maxVelocity * 14).toFixed(1)),
      extension: parseFloat(smoothedExt.toFixed(2)),
      trajectory: [...state.trajectory],
      targetZone: 'center_chest',
      accuracy: 0,
      estimatedPower: 0,
    };
  }

  private classifyPunch(tracking: HandTracking): PunchType {
    const vx = tracking.velocity.x;
    const vy = tracking.velocity.y;
    const isRight = tracking.hand === 'right';

    if (Math.abs(vy) > Math.abs(vx) * 1.3 && vy < -0.25) {
      return isRight ? 'right_uppercut' : 'left_uppercut';
    }
    if (Math.abs(vx) > Math.abs(vy) * 0.85 && Math.abs(vx) > 0.45) {
      return isRight ? 'right_hook' : 'left_hook';
    }
    return isRight ? 'cross' : 'jab';
  }

  reset() {
    (['left','right'] as Hand[]).forEach(h => {
      const s = this.states.get(h);
      if (s) {
        s.stabilityGate.clear();
        s.velAvg.clear();
        s.extAvg.clear();
      }
      this.states.set(h, this.createIdleState());
      this.lastPunchTime.set(h, 0);
    });
  }
}

export const punchDetector = new PunchDetector();
