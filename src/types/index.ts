export type Hand = 'left' | 'right';
export type PunchType = 'jab' | 'cross' | 'left_hook' | 'right_hook' | 'left_uppercut' | 'right_uppercut';
export type TargetZone = 'head' | 'left_temple' | 'right_temple' | 'upper_chest' | 'center_chest' | 'left_rib' | 'right_rib' | 'abdomen' | 'center_body';
export type GameMode = 'free' | 'speed' | 'accuracy' | 'combo' | 'reaction' | 'endurance' | 'demo';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type PunchState = 'IDLE' | 'READY' | 'MOVING' | 'EXTENDING' | 'IMPACT' | 'RECOVERY';

export interface PunchEvent {
  id: string;
  hand: Hand;
  type: PunchType;
  timestamp: number;
  velocity: number; // 0-20 normalized visual velocity
  acceleration: number;
  extension: number; // 0-1
  trajectory: { x: number; y: number; z: number }[];
  targetZone: TargetZone;
  accuracy: number; // 0-100
  estimatedPower: number; // 0-100 camera-based estimate
  reactionTime?: number; // seconds
  comboIndex?: number;
}

export interface TrackingPoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface HandTracking {
  hand: Hand;
  wrist: TrackingPoint;
  elbow?: TrackingPoint;
  shoulder?: TrackingPoint;
  landmarks: TrackingPoint[];
  velocity: { x: number; y: number; z: number };
  acceleration: { x: number; y: number; z: number };
  extension: number;
  state: PunchState;
  confidence: number;
}

export interface GameState {
  isActive: boolean;
  isPaused: boolean;
  mode: GameMode;
  difficulty: Difficulty;
  round: number;
  timeLeft: number;
  duration: number;
  score: number;
  combo: number;
  bestCombo: number;
  totalPunches: number;
  leftPunches: number;
  rightPunches: number;
  accuracyAvg: number;
  powerAvg: number;
  punches: PunchEvent[];
  activeTargetZone?: TargetZone | null;
  reactionStartTime?: number;
}

export interface ImpactResult {
  zone: TargetZone;
  power: number;
  accuracy: number;
  position: { x: number; y: number; z: number };
}

export interface VisionEngineInterface {
  initialize(): Promise<void>;
  startCamera(): Promise<MediaStream>;
  stopCamera(): void;
  getTrackingData(): { leftHand?: HandTracking; rightHand?: HandTracking };
  detectPunch(tracking: HandTracking): PunchEvent | null;
  dispose(): void;
}

export interface Settings {
  soundEnabled: boolean;
  graphicsQuality: 'low' | 'medium' | 'high' | 'ultra';
  reducedMotion: boolean;
  privacyMode: boolean;
  mirrorCamera: boolean;
  targetSize: number;
  difficulty: Difficulty;
  haptics: boolean;
}
