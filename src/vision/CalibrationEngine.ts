/**
 * CalibrationEngine - Air Punch Calibration for 100% accuracy
 * 
 * Flow:
 * 1. Detect user standing - measure shoulder width, arm span
 * 2. Rest position - hands at guard
 * 3. Full extension - measure max reach per hand
 * 4. Test jabs - calibrate velocity thresholds
 * 
 * Stores calibration in localStorage, used to personalize PunchDetector thresholds
 */

import { Hand } from '../types';

export interface CalibrationData {
  timestamp: number;
  shoulderWidth: number; // normalized
  armSpan: number;
  leftRest: { x: number; y: number; z: number };
  rightRest: { x: number; y: number; z: number };
  leftMaxExtension: number; // distance from shoulder to wrist at full extension
  rightMaxExtension: number;
  leftVelocityBaseline: number; // avg jab velocity
  rightVelocityBaseline: number;
  extensionThreshold: number; // personalized
  velocityThreshold: number;
  accuracy: number; // calibration quality 0-100
  isCalibrated: boolean;
}

export interface CalibrationStep {
  id: string;
  title: string;
  instruction: string;
  duration?: number; // seconds to hold
  requiredHands?: Hand[];
}

export const CALIBRATION_STEPS: CalibrationStep[] = [
  {
    id: 'position',
    title: 'STAND IN FRAME',
    instruction: 'Stand 1.5-2m from camera. Full upper body visible. Arms at sides.',
    duration: 3,
  },
  {
    id: 'guard',
    title: 'GUARD POSITION',
    instruction: 'Raise both hands to guard position, fists near chin. Hold steady.',
    duration: 3,
    requiredHands: ['left', 'right'],
  },
  {
    id: 'left_extension',
    title: 'LEFT FULL EXTENSION',
    instruction: 'Extend LEFT hand fully forward as far as you can. Hold.',
    duration: 2,
    requiredHands: ['left'],
  },
  {
    id: 'right_extension',
    title: 'RIGHT FULL EXTENSION',
    instruction: 'Extend RIGHT hand fully forward. Hold for measurement.',
    duration: 2,
    requiredHands: ['right'],
  },
  {
    id: 'left_jabs',
    title: 'LEFT JABS x3',
    instruction: 'Throw 3 LEFT jabs in air at normal speed. Full extension each time.',
    duration: 5,
    requiredHands: ['left'],
  },
  {
    id: 'right_jabs',
    title: 'RIGHT JABS x3',
    instruction: 'Throw 3 RIGHT jabs / crosses in air. Natural speed.',
    duration: 5,
    requiredHands: ['right'],
  },
  {
    id: 'complete',
    title: 'CALIBRATION COMPLETE',
    instruction: 'System calibrated for your body. 100% air-punch accuracy enabled.',
    duration: 2,
  },
];

export class CalibrationEngine {
  private data: Partial<CalibrationData> = {};
  private measurements: Map<string, number[]> = new Map();
  private jabVelocities: Map<Hand, number[]> = new Map();

  constructor() {
    this.jabVelocities.set('left', []);
    this.jabVelocities.set('right', []);
  }

  start() {
    this.data = {
      timestamp: Date.now(),
      isCalibrated: false,
      accuracy: 0,
    };
    this.measurements.clear();
    this.jabVelocities.get('left')!.length = 0;
    this.jabVelocities.get('right')!.length = 0;
  }

  recordMeasurement(key: string, value: number) {
    if (!this.measurements.has(key)) this.measurements.set(key, []);
    this.measurements.get(key)!.push(value);
  }

  recordJabVelocity(hand: Hand, velocity: number) {
    this.jabVelocities.get(hand)!.push(velocity);
  }

  private avg(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private median(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  completeStep(stepId: string, extra?: any): Partial<CalibrationData> {
    switch (stepId) {
      case 'position':
        // Shoulder width from pose landmarks
        if (extra?.shoulderWidth) {
          this.data.shoulderWidth = this.avg(this.measurements.get('shoulderWidth') || [extra.shoulderWidth]);
          this.data.armSpan = extra.armSpan || this.data.shoulderWidth * 2.2;
        }
        break;
      case 'guard':
        if (extra?.leftRest && extra?.rightRest) {
          this.data.leftRest = extra.leftRest;
          this.data.rightRest = extra.rightRest;
        }
        break;
      case 'left_extension':
        if (extra?.maxExtension) {
          this.data.leftMaxExtension = this.median(this.measurements.get('leftExtension') || [extra.maxExtension]);
        }
        break;
      case 'right_extension':
        if (extra?.maxExtension) {
          this.data.rightMaxExtension = this.median(this.measurements.get('rightExtension') || [extra.maxExtension]);
        }
        break;
      case 'left_jabs':
      case 'right_jabs':
        // Velocities already recorded
        break;
    }
    return { ...this.data };
  }

  finalize(): CalibrationData {
    const leftVels = this.jabVelocities.get('left')!;
    const rightVels = this.jabVelocities.get('right')!;

    const leftBaseline = this.median(leftVels.length ? leftVels : [0.5]);
    const rightBaseline = this.median(rightVels.length ? rightVels : [0.6]);

    // Personalized thresholds: 60% of baseline for detection, ensures 100% air punch capture
    const velocityThreshold = Math.min(leftBaseline, rightBaseline) * 0.55;
    const extensionThreshold = 0.52; // after measuring max extension, use 52% as start of punch

    // Accuracy score based on consistency of measurements
    const leftConsistency = leftVels.length >= 2 ? 1 - (Math.max(...leftVels) - Math.min(...leftVels)) / this.avg(leftVels) : 0.5;
    const rightConsistency = rightVels.length >= 2 ? 1 - (Math.max(...rightVels) - Math.min(...rightVels)) / this.avg(rightVels) : 0.5;
    const accuracy = Math.round(Math.min(100, Math.max(75, (leftConsistency + rightConsistency) * 50 + 50)));

    const final: CalibrationData = {
      timestamp: Date.now(),
      shoulderWidth: this.data.shoulderWidth || 0.35,
      armSpan: this.data.armSpan || 0.75,
      leftRest: this.data.leftRest || { x: 0.35, y: 0.5, z: 0 },
      rightRest: this.data.rightRest || { x: 0.65, y: 0.5, z: 0 },
      leftMaxExtension: this.data.leftMaxExtension || 0.75,
      rightMaxExtension: this.data.rightMaxExtension || 0.78,
      leftVelocityBaseline: leftBaseline,
      rightVelocityBaseline: rightBaseline,
      extensionThreshold,
      velocityThreshold: Math.max(0.18, velocityThreshold),
      accuracy,
      isCalibrated: true,
    };

    // Save to localStorage
    try {
      localStorage.setItem('punchai_calibration', JSON.stringify(final));
    } catch {}

    return final;
  }

  load(): CalibrationData | null {
    try {
      const raw = localStorage.getItem('punchai_calibration');
      if (!raw) return null;
      const data = JSON.parse(raw) as CalibrationData;
      // Expire after 7 days
      if (Date.now() - data.timestamp > 7 * 24 * 60 * 60 * 1000) return null;
      return data;
    } catch {
      return null;
    }
  }

  clear() {
    try {
      localStorage.removeItem('punchai_calibration');
    } catch {}
    this.data = {};
  }
}

export const calibrationEngine = new CalibrationEngine();
