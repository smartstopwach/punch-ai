import { GameState, GameMode, Difficulty, PunchEvent, TargetZone } from '../types';
import { ComboSystem } from './ComboSystem';
import { ScoreEngine } from './ScoreEngine';
import { GAME_MODES } from '../data/gameModes';

export class GameEngine {
  private state: GameState;
  private comboSystem: ComboSystem;
  private scoreEngine: ScoreEngine;
  private timerId: number | null = null;
  private onStateChange?: (s: GameState) => void;
  private onPunch?: (p: PunchEvent) => void;
  private onRoundEnd?: (s: GameState) => void;

  constructor() {
    this.comboSystem = new ComboSystem();
    this.scoreEngine = new ScoreEngine();
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      isActive: false,
      isPaused: false,
      mode: 'demo',
      difficulty: 'intermediate',
      round: 1,
      timeLeft: 60,
      duration: 60,
      score: 0,
      combo: 0,
      bestCombo: 0,
      totalPunches: 0,
      leftPunches: 0,
      rightPunches: 0,
      accuracyAvg: 0,
      powerAvg: 0,
      punches: [],
      activeTargetZone: null,
    };
  }

  bind(callbacks: {
    onStateChange?: (s: GameState) => void;
    onPunch?: (p: PunchEvent) => void;
    onRoundEnd?: (s: GameState) => void;
  }) {
    this.onStateChange = callbacks.onStateChange;
    this.onPunch = callbacks.onPunch;
    this.onRoundEnd = callbacks.onRoundEnd;
  }

  start(mode: GameMode, difficulty: Difficulty = 'intermediate') {
    const cfg = GAME_MODES.find(m => m.id === mode);
    const duration = cfg?.duration || 60;
    this.comboSystem.reset();
    this.state = {
      ...this.createInitialState(),
      isActive: true,
      mode,
      difficulty,
      duration: duration === 0 ? 9999 : duration,
      timeLeft: duration === 0 ? 9999 : duration,
      activeTargetZone: mode === 'accuracy' || mode === 'reaction' ? this.randomZone() : null,
    };
    this.emit();

    if (duration > 0) {
      this.startTimer();
    }

    if (mode === 'reaction') {
      this.scheduleReactionTarget();
    }
  }

  private startTimer() {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = window.setInterval(() => {
      if (!this.state.isActive || this.state.isPaused) return;
      this.state.timeLeft -= 1;
      this.comboSystem.checkExpiry();
      this.state.combo = this.comboSystem.getCombo();
      if (this.state.timeLeft <= 0) {
        this.endRound();
      } else {
        this.emit();
      }
    }, 1000) as unknown as number;
  }

  private scheduleReactionTarget() {
    if (this.state.mode !== 'reaction' || !this.state.isActive) return;
    const delay = 1200 + Math.random() * 1800;
    setTimeout(() => {
      if (!this.state.isActive) return;
      this.state.activeTargetZone = this.randomZone();
      (this.state as any).reactionStartTime = Date.now();
      this.emit();
      this.scheduleReactionTarget();
    }, delay);
  }

  private randomZone(): TargetZone {
    const zones: TargetZone[] = ['head','upper_chest','center_chest','left_rib','right_rib','abdomen'];
    return zones[Math.floor(Math.random()*zones.length)];
  }

  registerPunch(raw: PunchEvent) {
    if (!this.state.isActive) return;

    // Calculate score
    const score = this.scoreEngine.calculate(raw);
    const comboResult = this.comboSystem.registerHit(raw.timestamp);

    const punch: PunchEvent = {
      ...raw,
      comboIndex: comboResult.combo,
      reactionTime: this.state.reactionStartTime ? (Date.now() - this.state.reactionStartTime)/1000 : raw.reactionTime
    };

    this.state.punches = [...this.state.punches.slice(-99), punch];
    this.state.totalPunches += 1;
    if (punch.hand === 'left') this.state.leftPunches += 1;
    else this.state.rightPunches += 1;
    this.state.score += score;
    this.state.combo = comboResult.combo;
    this.state.bestCombo = this.comboSystem.getBest();

    // Update avgs
    const powers = this.state.punches.map(p => p.estimatedPower);
    const accs = this.state.punches.map(p => p.accuracy);
    this.state.powerAvg = powers.length ? Math.round(powers.reduce((a,b)=>a+b,0)/powers.length) : 0;
    this.state.accuracyAvg = accs.length ? Math.round(accs.reduce((a,b)=>a+b,0)/accs.length) : 0;

    // Accuracy mode: check if hit active zone
    if ((this.state.mode === 'accuracy' || this.state.mode === 'reaction') && this.state.activeTargetZone) {
      if (punch.targetZone === this.state.activeTargetZone) {
        // bonus
        this.state.score += 50;
      }
      // new target
      if (this.state.mode === 'accuracy') {
        this.state.activeTargetZone = this.randomZone();
      } else {
        this.state.activeTargetZone = null;
      }
    }

    this.emit();
    this.onPunch?.(punch);
  }

  endRound() {
    this.state.isActive = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.emit();
    this.onRoundEnd?.(this.state);
  }

  pause() {
    this.state.isPaused = true;
    this.emit();
  }

  resume() {
    this.state.isPaused = false;
    this.emit();
  }

  reset() {
    if (this.timerId) clearInterval(this.timerId);
    this.state = this.createInitialState();
    this.comboSystem.reset();
    this.emit();
  }

  private emit() {
    this.onStateChange?.({ ...this.state });
  }

  getState() { return { ...this.state }; }
}

export const gameEngine = new GameEngine();
