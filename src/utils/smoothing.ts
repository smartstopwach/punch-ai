export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xPrev: number | null = null;
  private dxPrev: number | null = null;
  private tPrev: number | null = null;

  constructor(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private alpha(cutoff: number, dt: number) {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  filter(value: number, timestamp = performance.now() / 1000): number {
    if (this.tPrev === null) {
      this.tPrev = timestamp;
      this.xPrev = value;
      this.dxPrev = 0;
      return value;
    }
    const dt = Math.max(timestamp - this.tPrev, 0.001);
    const dx = (value - (this.xPrev ?? value)) / dt;
    const edx = this.dxPrev === null ? dx : this.dxPrev + this.alpha(this.dCutoff, dt) * (dx - this.dxPrev);
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    const result = (this.xPrev ?? value) + this.alpha(cutoff, dt) * (value - (this.xPrev ?? value));
    this.xPrev = result;
    this.dxPrev = edx;
    this.tPrev = timestamp;
    return result;
  }
}

export class VectorFilter {
  fx: OneEuroFilter;
  fy: OneEuroFilter;
  fz: OneEuroFilter;
  constructor() {
    this.fx = new OneEuroFilter(1.2, 0.02);
    this.fy = new OneEuroFilter(1.2, 0.02);
    this.fz = new OneEuroFilter(1.2, 0.02);
  }
  filter(v: {x:number,y:number,z?:number}, t?: number) {
    return {
      x: this.fx.filter(v.x, t),
      y: this.fy.filter(v.y, t),
      z: v.z !== undefined ? this.fz.filter(v.z, t) : undefined,
    };
  }
}
