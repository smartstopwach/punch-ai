import { PunchEvent, TargetZone, Hand, PunchType } from '../types';

const zones: TargetZone[] = ['head','left_temple','right_temple','upper_chest','center_chest','left_rib','right_rib','abdomen','center_body'];
const punchTypes: PunchType[] = ['jab','cross','left_hook','right_hook','left_uppercut','right_uppercut'];

export function generateMockPunch(seq = 0): PunchEvent {
  const hand: Hand = Math.random() > 0.5 ? 'right' : 'left';
  const isRight = hand === 'right';
  let type: PunchType;
  const r = Math.random();
  if (r < 0.35) type = isRight ? 'cross' : 'jab';
  else if (r < 0.6) type = isRight ? 'right_hook' : 'left_hook';
  else if (r < 0.8) type = isRight ? 'right_uppercut' : 'left_uppercut';
  else type = punchTypes[Math.floor(Math.random()*punchTypes.length)];

  const velocity = 3 + Math.random()*9 + (seq % 7 === 0 ? 2 : 0); // 3-14
  const extension = 0.6 + Math.random()*0.4;
  const accuracy = 65 + Math.random()*35;
  const trajectoryQuality = 0.7 + Math.random()*0.3;
  // Estimated Power formula: weighted combination
  const normalizedVelocity = Math.min(velocity / 12, 1);
  const power = Math.round(
    (normalizedVelocity * 0.45 + extension * 0.25 + trajectoryQuality * 0.15 + (accuracy/100)*0.15) * 100
  );

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    hand,
    type,
    timestamp: Date.now(),
    velocity: parseFloat(velocity.toFixed(1)),
    acceleration: parseFloat((velocity * (0.8 + Math.random()*0.6)).toFixed(1)),
    extension: parseFloat(extension.toFixed(2)),
    trajectory: Array.from({length: 8}, (_,i) => ({
      x: (Math.random()-0.5)*0.3,
      y: -i*0.08 + (Math.random()-0.5)*0.1,
      z: i*0.12
    })),
    targetZone: zones[Math.floor(Math.random()*zones.length)],
    accuracy: Math.round(accuracy),
    estimatedPower: clamp(power, 12, 99),
    reactionTime: 0.18 + Math.random()*0.6,
    comboIndex: seq
  };
}

function clamp(v:number, min:number, max:number){ return Math.min(max, Math.max(min, v)); }

export function generateSessionStats() {
  return {
    punches: Array.from({length: 12}, (_,i) => ({
      round: i+1,
      count: 42 + Math.floor(Math.random()*40),
      power: 68 + Math.floor(Math.random()*25),
      accuracy: 72 + Math.floor(Math.random()*22)
    })),
    powerHistory: Array.from({length: 30}, () => 60 + Math.random()*35),
    reactionHistory: Array.from({length: 20}, () => 0.2 + Math.random()*0.5)
  };
}
