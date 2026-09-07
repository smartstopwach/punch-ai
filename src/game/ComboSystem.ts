export class ComboSystem {
  private combo = 0;
  private lastPunchTime = 0;
  private windowMs = 1800;
  private bestCombo = 0;

  registerHit(timestamp = Date.now()): { combo: number; isNewBest: boolean; reset: boolean } {
    const now = timestamp;
    const withinWindow = now - this.lastPunchTime < this.windowMs;

    if (withinWindow) {
      this.combo += 1;
    } else {
      this.combo = 1;
    }

    this.lastPunchTime = now;
    const isNewBest = this.combo > this.bestCombo;
    if (isNewBest) this.bestCombo = this.combo;

    return { combo: this.combo, isNewBest, reset: !withinWindow && this.combo === 1 };
  }

  reset() {
    this.combo = 0;
    this.lastPunchTime = 0;
  }

  checkExpiry(now = Date.now()): boolean {
    if (this.combo > 0 && now - this.lastPunchTime > this.windowMs) {
      this.combo = 0;
      return true;
    }
    return false;
  }

  getCombo() { return this.combo; }
  getBest() { return this.bestCombo; }
  setWindow(ms: number) { this.windowMs = ms; }
}
