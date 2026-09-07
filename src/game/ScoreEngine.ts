import { PunchEvent } from '../types';
import { targetMapper } from '../vision/TargetMapper';

export class ScoreEngine {
  calculate(punch: PunchEvent): number {
    const base = punch.estimatedPower;
    const accuracyFactor = punch.accuracy / 100;
    const multiplier = targetMapper.getMultiplier(punch.targetZone);
    const comboBonus = punch.comboIndex ? Math.min(punch.comboIndex * 0.05, 0.5) : 0;
    const reactionBonus = punch.reactionTime ? Math.max(0, (1 - punch.reactionTime) * 20) : 0;

    const score = Math.round((base * accuracyFactor * multiplier * 10) + reactionBonus + comboBonus * 100);
    return Math.max(10, score);
  }

  calculateAccuracy(distanceFromCenter: number): number {
    // distance 0 = 100%, 0.5 = 0%
    const acc = Math.max(0, 100 - distanceFromCenter * 220);
    return Math.round(acc);
  }
}

export const scoreEngine = new ScoreEngine();
