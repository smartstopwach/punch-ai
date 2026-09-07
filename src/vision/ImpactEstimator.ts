import { PunchEvent } from '../types';

/**
 * Camera-based Estimated Power
 * DO NOT claim Newton force.
 * Weighted visual features.
 */
export class ImpactEstimator {
  // Future: accept SensorInput for calibrated force
  estimate(punch: Partial<PunchEvent> & { velocity: number; extension: number; accuracy: number; trajectory?: any[] }): number {
    const v = punch.velocity ?? 0;
    const ext = punch.extension ?? 0;
    const acc = punch.accuracy ?? 80;
    const trajQuality = this.trajectoryQuality(punch.trajectory);

    const normV = Math.min(v / 12, 1); // 12 m/s visual equiv cap
    const consistency = this.consistencyFactor(punch);

    const power =
      normV * 0.42 +
      ext * 0.28 +
      trajQuality * 0.14 +
      (acc / 100) * 0.10 +
      consistency * 0.06;

    return Math.round(Math.min(99, Math.max(8, power * 100)));
  }

  private trajectoryQuality(traj?: {x:number;y:number;z:number}[]): number {
    if (!traj || traj.length < 3) return 0.75;
    // Straightness: less deviation
    let dev = 0;
    for (let i=1;i<traj.length;i++) {
      dev += Math.abs(traj[i].x - traj[i-1].x);
    }
    const straightness = 1 - Math.min(dev / traj.length, 1);
    return 0.6 + straightness * 0.4;
  }

  private consistencyFactor(p: Partial<PunchEvent>): number {
    // Placeholder for temporal consistency across recent punches
    // In real engine, would use history buffer
    return 0.7 + Math.random()*0.3;
  }

  // Future hardware path
  estimateFromSensor(forceNewtons: number, calibration: { scale: number; offset: number }): number {
    const calibrated = (forceNewtons + calibration.offset) * calibration.scale;
    // Map N to 0-100 for display, but keep true N separately
    return Math.min(100, Math.max(0, (calibrated / 500) * 100));
  }
}

export const impactEstimator = new ImpactEstimator();
