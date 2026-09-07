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
  private velocityThreshold = 0.14; // lowered from 0.18 for instant response
  private extensionThreshold = 0.40; // lowered from 0.45
  private cooldownMs = 180; // lowered from 320 for faster combo
  private lastPunchTime: Map<Hand, number> = new Map();
  private calibration: CalibrationData | null = null;

  constructor() {
    (['left','right'] as Hand[]).forEach(h => {
      this.states.set(h, this.createIdleState());
      this.filters.set(h, new OneEuroFilter(2.5, 0.05, 1.2)); // faster filter
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
      velAvg: new MovingAverage(2), // was 4, now 2 for low latency
      extAvg: new MovingAverage(2), // was 5, now 2
    };
  }

  setCalibration(data: CalibrationData | null) {
    this.calibration = data;
    if (data) {
      // Use calibrated but keep low for instant response
      this.velocityThreshold = Math.max(0.12, Math.min(0.20, data.velocityThreshold * 0.8));
      this.extensionThreshold = Math.max(0.38, Math.min(0.48, data.extensionThreshold * 0.85));
      console.log('[PunchDetector] Low-latency calibrated:', {
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
   * LOW LATENCY state machine - instant response
   * IDLE -> READY (immediate) -> MOVING (2 frames) -> EXTENDING (instant) -> IMPACT (on 0.78 ext)
   */
  update(tracking: HandTracking): PunchEvent | null {
    const hand = tracking.hand;
    const state = this.states.get(hand)!;
    const now = performance.now();
    const lastPunch = this.lastPunchTime.get(hand)!;

    if (now - lastPunch < this.cooldownMs && state.state !== 'RECOVERY') {
      return null;
    }

    if (tracking.confidence < 0.32) { // lowered from 0.38 for more sensitive
      if (state.state !== 'IDLE' && now - state.startTime > 300) state.state = 'READY';
      return null;
    }

    const rawSpeed = Math.hypot(tracking.velocity.x, tracking.velocity.y, tracking.velocity.z ?? 0);
    const filteredSpeed = this.filters.get(hand)!.filter(rawSpeed, now/1000);
    const smoothedSpeed = state.velAvg.add(filteredSpeed);
    const smoothedExt = state.extAvg.add(tracking.extension);

    const gate = state.stabilityGate.check(smoothedExt, smoothedSpeed, {
      extension: this.extensionThreshold,
      velocity: this.velocityThreshold
    });

    switch (state.state) {
      case 'IDLE':
        // Instant ready
        state.state = 'READY';
        state.startPos = { ...tracking.wrist, z: tracking.wrist.z ?? 0 };
        state.trajectory = [];
        break;

      case 'READY':
        // INSTANT trigger - 1 frame enough for low latency
        if ((smoothedSpeed > this.velocityThreshold * 0.5 && smoothedExt > 0.32) || smoothedExt > 0.72) {
          state.state = 'MOVING';
          state.startTime = now;
          state.maxVelocity = smoothedSpeed;
          state.trajectory = [{ x: tracking.wrist.x, y: tracking.wrist.y, z: tracking.wrist.z ?? 0 }];
        }
        break;

      case 'MOVING':
        state.maxVelocity = Math.max(state.maxVelocity, smoothedSpeed);
        state.trajectory.push({ x: tracking.wrist.x, y: tracking.wrist.y, z: tracking.wrist.z ?? 0 });
        
        // INSTANT extend - no need for 3 frames
        if (smoothedExt > this.extensionThreshold * 0.9 && smoothedSpeed > this.velocityThreshold * 0.7) {
          state.state = 'EXTENDING';
        } else if (smoothedSpeed < this.velocityThreshold * 0.2 && now - state.startTime > 150) {
          state.state = 'READY';
        }
        if (now - state.startTime > 800) {
          state.state = 'READY';
          state.stabilityGate.clear();
        }
        break;

      case 'EXTENDING':
        state.maxVelocity = Math.max(state.maxVelocity, smoothedSpeed);
        state.trajectory.push({ x: tracking.wrist.x, y: tracking.wrist.y, z: tracking.wrist.z ?? 0 });
        
        // LOW LATENCY IMPACT - instant on 0.75 extension, no waiting for velocity drop
        const instantImpact = smoothedExt > 0.75;
        const velocityImpact = gate.shouldImpact && state.maxVelocity > this.velocityThreshold * 0.75;
        
        if (instantImpact || velocityImpact) {
          const punch = this.createPunchEvent(tracking, state, smoothedExt, smoothedSpeed);
          this.lastPunchTime.set(hand, now);
          state.state = 'RECOVERY';
          setTimeout(() => {
            const s = this.states.get(hand);
            if (s) {
              s.state = 'READY';
              s.stabilityGate.clear();
            }
          }, 120); // reduced from 180 to 120
          return punch;
        }
        if (now - state.startTime > 500) {
          // Timeout but still count as punch if extension high
          if (smoothedExt > 0.65) {
            const punch = this.createPunchEvent(tracking, state, smoothedExt, smoothedSpeed);
            this.lastPunchTime.set(hand, now);
            state.state = 'RECOVERY';
            setTimeout(() => {
              const s = this.states.get(hand);
              if (s) s.state = 'READY';
            }, 120);
            return punch;
          }
          state.state = 'READY';
          state.stabilityGate.clear();
        }
        break;

      case 'RECOVERY':
        if (smoothedSpeed < this.velocityThreshold * 0.4 || now - state.startTime > 200) {
          state.state = 'READY';
          state.stabilityGate.clear();
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

    if (Math.abs(vy) > Math.abs(vx) * 1.3 && vy < -0.22) {
      return isRight ? 'right_uppercut' : 'left_uppercut';
    }
    if (Math.abs(vx) > Math.abs(vy) * 0.8 && Math.abs(vx) > 0.38) {
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
