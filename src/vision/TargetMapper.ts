import { TargetZone } from '../types';

export interface ScreenPoint { x: number; y: number; }

export class TargetMapper {
  // Maps normalized hand coords (0-1) to dummy target zones
  // This is a 2D approximation for prototype; future 3D raycasting
  private zones: Record<TargetZone, { x: number; y: number; r: number; multiplier: number }> = {
    head: { x: 0.5, y: 0.18, r: 0.11, multiplier: 1.4 },
    left_temple: { x: 0.43, y: 0.19, r: 0.05, multiplier: 1.3 },
    right_temple: { x: 0.57, y: 0.19, r: 0.05, multiplier: 1.3 },
    upper_chest: { x: 0.5, y: 0.33, r: 0.13, multiplier: 1.1 },
    center_chest: { x: 0.5, y: 0.45, r: 0.12, multiplier: 1.0 },
    left_rib: { x: 0.38, y: 0.5, r: 0.08, multiplier: 1.15 },
    right_rib: { x: 0.62, y: 0.5, r: 0.08, multiplier: 1.15 },
    abdomen: { x: 0.5, y: 0.62, r: 0.11, multiplier: 1.05 },
    center_body: { x: 0.5, y: 0.48, r: 0.22, multiplier: 1.0 },
  };

  map(point: ScreenPoint): { zone: TargetZone; accuracy: number; distance: number } {
    let best: TargetZone = 'center_body';
    let bestDist = Infinity;
    let bestAcc = 0;

    (Object.entries(this.zones) as [TargetZone, typeof this.zones[TargetZone]][]).forEach(([zone, cfg]) => {
      const dx = point.x - cfg.x;
      const dy = point.y - cfg.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const acc = Math.max(0, 100 * (1 - dist / (cfg.r * 2.2)));
      if (dist < bestDist) {
        bestDist = dist;
        best = zone;
        bestAcc = acc;
      }
    });

    return { zone: best, accuracy: Math.round(Math.min(100, bestAcc)), distance: bestDist };
  }

  getMultiplier(zone: TargetZone): number {
    return this.zones[zone]?.multiplier ?? 1.0;
  }

  getAllZones() {
    return this.zones;
  }
}

export const targetMapper = new TargetMapper();
