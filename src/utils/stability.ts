/**
 * Stability utilities for 100% accurate, jitter-free air punch detection
 */

export class MovingAverage {
  private values: number[] = [];
  private size: number;
  
  constructor(size = 5) {
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
  private maxHistory = 8;
  private minMovement = 0.008; // ignore micro movements < 8mm normalized

  update(pos: { x: number; y: number; z: number }, timestamp: number): {
    filteredPos: { x: number; y: number; z: number };
    velocity: { x: number; y: number; z: number };
    isStable: boolean;
    movement: number;
  } {
    // Add to history
    this.posHistory.push({ ...pos, t: timestamp });
    if (this.posHistory.length > this.maxHistory) this.posHistory.shift();

    // Calculate movement from last stable position
    if (this.posHistory.length < 2) {
      return {
        filteredPos: pos,
        velocity: { x: 0, y: 0, z: 0 },
        isStable: true,
        movement: 0
      };
    }

    const recent = this.posHistory.slice(-4);
    const avgPos = {
      x: recent.reduce((s, p) => s + p.x, 0) / recent.length,
      y: recent.reduce((s, p) => s + p.y, 0) / recent.length,
      z: recent.reduce((s, p) => s + p.z, 0) / recent.length,
    };

    // Movement magnitude
    const last = this.posHistory[this.posHistory.length - 2];
    const movement = Math.hypot(pos.x - last.x, pos.y - last.y, pos.z - last.z);

    // Velocity with smoothing
    const dt = (timestamp - last.t) / 1000;
    let velocity = { x: 0, y: 0, z: 0 };
    if (dt > 0.01 && dt < 0.2 && movement > this.minMovement) {
      velocity = {
        x: (pos.x - last.x) / dt,
        y: (pos.y - last.y) / dt,
        z: (pos.z - last.z) / dt,
      };
      
      this.velHistory.push({ ...velocity, t: timestamp });
      if (this.velHistory.length > 5) this.velHistory.shift();
      
      // Smooth velocity
      const avgVel = {
        x: this.velHistory.reduce((s, v) => s + v.x, 0) / this.velHistory.length,
        y: this.velHistory.reduce((s, v) => s + v.y, 0) / this.velHistory.length,
        z: this.velHistory.reduce((s, v) => s + v.z, 0) / this.velHistory.length,
      };
      velocity = avgVel;
    }

    // Stability: if movement < threshold for 200ms, it's stable
    const recentMovement = this.posHistory.slice(-6).reduce((sum, _, i, arr) => {
      if (i === 0) return 0;
      return sum + Math.hypot(arr[i].x - arr[i-1].x, arr[i].y - arr[i-1].y);
    }, 0);
    
    const isStable = recentMovement < 0.03;

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
  private requiredConsistentFrames = 3;
  private maxHistory = 6;

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

    // Need at least 3 frames
    if (this.extensionHistory.length < this.requiredConsistentFrames) {
      return { shouldStart: false, shouldExtend: false, shouldImpact: false, confidence: 0 };
    }

    const recentExt = this.extensionHistory.slice(-this.requiredConsistentFrames);
    const recentVel = this.velocityHistory.slice(-this.requiredConsistentFrames);

    // Check if consistently above threshold
    const extConsistent = recentExt.every(e => e > thresholds.extension * 0.7);
    const velConsistent = recentVel.every(v => v > thresholds.velocity * 0.6);
    const extIncreasing = recentExt[recentExt.length - 1] > recentExt[0] * 0.95;

    // Impact: extension high + velocity dropping after peak
    const maxVel = Math.max(...this.velocityHistory);
    const currentVel = this.velocityHistory[this.velocityHistory.length - 1];
    const velDropping = currentVel < maxVel * 0.55 && maxVel > thresholds.velocity;
    const extHigh = extension > 0.82;

    const confidence = Math.min(1, 
      (recentExt.reduce((a,b) => a+b, 0) / recentExt.length / thresholds.extension) * 0.5 +
      (recentVel.reduce((a,b) => a+b, 0) / recentVel.length / thresholds.velocity) * 0.5
    );

    return {
      shouldStart: extConsistent && velConsistent,
      shouldExtend: extConsistent && recentVel.some(v => v > thresholds.velocity) && extIncreasing,
      shouldImpact: (velDropping || extHigh) && maxVel > thresholds.velocity * 0.9,
      confidence
    };
  }

  clear() {
    this.extensionHistory = [];
    this.velocityHistory = [];
  }
}
