/**
 * Stability utilities - TUNED FOR LOW LATENCY + HIGH STABILITY
 */

export class MovingAverage {
  private values: number[] = [];
  private size: number;
  
  constructor(size = 2) { // reduced from 5 to 2 for low latency
    this.size = size;
  }
  
  add(value: number): number {
    this.values.push(value);
    if (this.values.length > this.size) this.values.shift();
    return this.get();
  }
  
  get(): number {
    if (this.values.length === 0) return 0;
    return this.values.reduce((a, b) => a + b, 0) / this.values.length;
  }
  
  clear() {
    this.values = [];
  }
}

export class StabilityFilter {
  private posHistory: { x: number; y: number; z: number; t: number }[] = [];
  private velHistory: { x: number; y: number; z: number; t: number }[] = [];
  private maxHistory = 4; // reduced from 8 to 4 for low latency
  private minMovement = 0.005; // reduced from 0.008 to 0.005 for faster response

  update(pos: { x: number; y: number; z: number }, timestamp: number): {
    filteredPos: { x: number; y: number; z: number };
    velocity: { x: number; y: number; z: number };
    isStable: boolean;
    movement: number;
  } {
    this.posHistory.push({ ...pos, t: timestamp });
    if (this.posHistory.length > this.maxHistory) this.posHistory.shift();

    if (this.posHistory.length < 2) {
      return {
        filteredPos: pos,
        velocity: { x: 0, y: 0, z: 0 },
        isStable: true,
        movement: 0
      };
    }

    // Use only last 2 for low latency, not 4
    const recent = this.posHistory.slice(-2);
    const avgPos = {
      x: recent.reduce((s, p) => s + p.x, 0) / recent.length,
      y: recent.reduce((s, p) => s + p.y, 0) / recent.length,
      z: recent.reduce((s, p) => s + p.z, 0) / recent.length,
    };

    const last = this.posHistory[this.posHistory.length - 2];
    const movement = Math.hypot(pos.x - last.x, pos.y - last.y, pos.z - last.z);

    let velocity = { x: 0, y: 0, z: 0 };
    const dt = (timestamp - last.t) / 1000;
    if (dt > 0.008 && dt < 0.15 && movement > this.minMovement) {
      velocity = {
        x: (pos.x - last.x) / dt,
        y: (pos.y - last.y) / dt,
        z: (pos.z - last.z) / dt,
      };
      
      this.velHistory.push({ ...velocity, t: timestamp });
      if (this.velHistory.length > 3) this.velHistory.shift(); // reduced from 5 to 3
      
      // Light smoothing - only 2 frames for low latency
      const avgVel = {
        x: this.velHistory.slice(-2).reduce((s, v) => s + v.x, 0) / Math.min(2, this.velHistory.length),
        y: this.velHistory.slice(-2).reduce((s, v) => s + v.y, 0) / Math.min(2, this.velHistory.length),
        z: this.velHistory.slice(-2).reduce((s, v) => s + v.z, 0) / Math.min(2, this.velHistory.length),
      };
      velocity = avgVel;
    }

    // Stability check - faster, 120ms window instead of 200ms
    const recentMovement = this.posHistory.slice(-4).reduce((sum, _, i, arr) => {
      if (i === 0) return 0;
      return sum + Math.hypot(arr[i].x - arr[i-1].x, arr[i].y - arr[i-1].y);
    }, 0);
    
    const isStable = recentMovement < 0.04; // slightly higher threshold for faster unstable detection

    return {
      filteredPos: avgPos,
      velocity,
      isStable,
      movement
    };
  }

  clear() {
    this.posHistory = [];
    this.velHistory = [];
  }
}

export class PunchStabilityGate {
  private extensionHistory: number[] = [];
  private velocityHistory: number[] = [];
  private requiredConsistentFrames = 2; // reduced from 3 to 2 for low latency
  private maxHistory = 4; // reduced from 6 to 4

  check(extension: number, velocity: number, thresholds: { extension: number; velocity: number }): {
    shouldStart: boolean;
    shouldExtend: boolean;
    shouldImpact: boolean;
    confidence: number;
  } {
    this.extensionHistory.push(extension);
    this.velocityHistory.push(velocity);
    if (this.extensionHistory.length > this.maxHistory) this.extensionHistory.shift();
    if (this.velocityHistory.length > this.maxHistory) this.velocityHistory.shift();

    if (this.extensionHistory.length < this.requiredConsistentFrames) {
      return { shouldStart: false, shouldExtend: false, shouldImpact: false, confidence: 0 };
    }

    const recentExt = this.extensionHistory.slice(-this.requiredConsistentFrames);
    const recentVel = this.velocityHistory.slice(-this.requiredConsistentFrames);

    // Lower thresholds for faster trigger
    const extConsistent = recentExt.every(e => e > thresholds.extension * 0.6); // was 0.7
    const velConsistent = recentVel.every(v => v > thresholds.velocity * 0.5); // was 0.6
    const extIncreasing = recentExt[recentExt.length - 1] >= recentExt[0] * 0.90; // was 0.95, allow slight

    // Impact - INSTANT on high extension, don't wait for velocity drop
    const maxVel = Math.max(...this.velocityHistory);
    const currentVel = this.velocityHistory[this.velocityHistory.length - 1];
    const velDropping = currentVel < maxVel * 0.65 && maxVel > thresholds.velocity * 0.85; // was 0.55, 0.9
    const extHigh = extension > 0.78; // was 0.82, lower for faster trigger
    const extVeryHigh = extension > 0.88; // instant trigger

    const confidence = Math.min(1, 
      (recentExt.reduce((a,b) => a+b, 0) / recentExt.length / thresholds.extension) * 0.5 +
      (recentVel.reduce((a,b) => a+b, 0) / recentVel.length / thresholds.velocity) * 0.5
    );

    return {
      shouldStart: extConsistent && velConsistent,
      shouldExtend: (extConsistent && recentVel.some(v => v > thresholds.velocity * 0.9)) || extVeryHigh,
      shouldImpact: extVeryHigh || (velDropping || extHigh) && maxVel > thresholds.velocity * 0.8,
      confidence
    };
  }

  clear() {
    this.extensionHistory = [];
    this.velocityHistory = [];
  }
}
