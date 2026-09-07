import { HandTracking, PunchEvent, PunchState, PunchType, Hand } from '../types';
import { OneEuroFilter } from '../utils/smoothing';

interface DetectorState {
  state: PunchState;
  startTime: number;
  startPos: { x: number; y: number; z: number };
  maxVelocity: number;
  extension: number;
  trajectory: { x: number; y: number; z: number }[];
}

export class PunchDetector {
  private states: Map<Hand, DetectorState> = new Map();
  private filters: Map<Hand, OneEuroFilter> = new Map();
  private velocityThreshold = 0.35; // normalized units per second
  private extensionThreshold = 0.55;
  private cooldownMs = 280;
  private lastPunchTime: Map<Hand, number> = new Map();

  constructor() {
    (['left','right'] as Hand[]).forEach(h => {
      this.states.set(h, this.createIdleState());
      this.filters.set(h, new OneEuroFilter(1.5, 0.02));
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
      trajectory: []
    };
  }

  /**
   * State machine:
   * IDLE -> READY -> MOVING -> EXTENDING -> IMPACT -> RECOVERY -> READY
   */
  update(tracking: HandTracking): PunchEvent | null {
    const hand = tracking.hand;
    const state = this.states.get(hand)!;
    const now = performance.now();
    const lastPunch = this.lastPunchTime.get(hand)!;

    if (now - lastPunch < this.cooldownMs && state.state !== 'RECOVERY') {
      // Prevent double detection
      return null;
    }

    const speed = Math.hypot(tracking.velocity.x, tracking.velocity.y, tracking.velocity.z ?? 0);
    const filteredSpeed = this.filters.get(hand)!.filter(speed, now/1000);

    switch (state.state) {
      case 'IDLE':
        if (tracking.confidence > 0.5) {
          state.state = 'READY';
          state.startPos = { ...tracking.wrist, z: tracking.wrist.z ?? 0 };
          state.trajectory = [];
        }
        break;

      case 'READY':
        if (filteredSpeed > this.velocityThreshold * 0.6 && tracking.extension > 0.35) {
          state.state = 'MOVING';
          state.startTime = now;
          state.maxVelocity = filteredSpeed;
          state.trajectory = [ { x: tracking.wrist.x, y: tracking.wrist.y, z: tracking.wrist.z ?? 0 } ];
        }
        break;

      case 'MOVING':
        state.maxVelocity = Math.max(state.maxVelocity, filteredSpeed);
        state.trajectory.push({ x: tracking.wrist.x, y: tracking.wrist.y, z: tracking.wrist.z ?? 0 });
        if (tracking.extension > this.extensionThreshold && filteredSpeed > this.velocityThreshold) {
          state.state = 'EXTENDING';
        } else if (filteredSpeed < this.velocityThreshold * 0.3) {
          state.state = 'READY';
        }
        // Timeout if taking too long
        if (now - state.startTime > 800) state.state = 'READY';
        break;

      case 'EXTENDING':
        state.maxVelocity = Math.max(state.maxVelocity, filteredSpeed);
        state.trajectory.push({ x: tracking.wrist.x, y: tracking.wrist.y, z: tracking.wrist.z ?? 0 });
        // Impact detected when velocity drops sharply after peak
        if (filteredSpeed < state.maxVelocity * 0.45 || tracking.extension > 0.85) {
          state.state = 'IMPACT';
          const punch = this.createPunchEvent(tracking, state);
          this.lastPunchTime.set(hand, now);
          state.state = 'RECOVERY';
          setTimeout(() => {
            const s = this.states.get(hand);
            if (s) s.state = 'READY';
          }, 180);
          return punch;
        }
        if (now - state.startTime > 600) state.state = 'READY';
        break;

      case 'RECOVERY':
        if (filteredSpeed < this.velocityThreshold * 0.5) {
          state.state = 'READY';
        }
        break;
    }

    return null;
  }

  private createPunchEvent(tracking: HandTracking, state: DetectorState): PunchEvent {
    const type = this.classifyPunch(tracking);
    return {
      id: `${tracking.hand}-${Date.now()}`,
      hand: tracking.hand,
      type,
      timestamp: Date.now(),
      velocity: parseFloat((state.maxVelocity * 12).toFixed(1)), // map to visual m/s
      acceleration: parseFloat((state.maxVelocity * 15).toFixed(1)),
      extension: tracking.extension,
      trajectory: [...state.trajectory],
      targetZone: 'center_chest', // will be overridden by TargetMapper
      accuracy: 0,
      estimatedPower: 0,
    };
  }

  private classifyPunch(tracking: HandTracking): PunchType {
    const vx = tracking.velocity.x;
    const vy = tracking.velocity.y;
    const isRight = tracking.hand === 'right';

    // Simple heuristic based on direction
    if (Math.abs(vy) > Math.abs(vx) * 1.2 && vy < -0.2) {
      return isRight ? 'right_uppercut' : 'left_uppercut';
    }
    if (Math.abs(vx) > Math.abs(vy) * 0.8) {
      // Hook: strong horizontal component
      if (Math.abs(vx) > 0.4) {
        return isRight ? 'right_hook' : 'left_hook';
      }
    }
    return isRight ? 'cross' : 'jab';
  }

  reset() {
    (['left','right'] as Hand[]).forEach(h => {
      this.states.set(h, this.createIdleState());
      this.lastPunchTime.set(h, 0);
    });
  }
}

export const punchDetector = new PunchDetector();
