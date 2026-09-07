import { generateMockPunch } from '../data/mockData';
import { PunchEvent } from '../types';

/**
 * MockEngine simulates realistic hand movements and punch stream
 * so demo works without camera.
 */
export class MockEngine {
  private intervalId: number | null = null;
  private punchCallback: ((p: PunchEvent) => void) | null = null;
  private seq = 0;
  private isRunning = false;

  start(callback: (p: PunchEvent) => void, rateMs = 900) {
    if (this.isRunning) return;
    this.punchCallback = callback;
    this.isRunning = true;
    this.seq = 0;

    const tick = () => {
      if (!this.isRunning || !this.punchCallback) return;
      const punch = generateMockPunch(this.seq++);
      this.punchCallback(punch);
      // Dynamic rate: faster during combos, slower otherwise
      const nextRate = 500 + Math.random() * 800 + (this.seq % 5 === 0 ? -200 : 0);
      this.intervalId = window.setTimeout(tick, nextRate) as unknown as number;
    };
    tick();
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId !== null) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
  }

  // For combo challenge
  generateComboSequence(length = 4): PunchEvent[] {
    return Array.from({ length }, (_, i) => generateMockPunch(i));
  }
}

export const mockEngine = new MockEngine();
