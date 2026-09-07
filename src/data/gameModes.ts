import { GameMode } from '../types';

export interface GameModeConfig {
  id: GameMode;
  title: string;
  subtitle: string;
  description: string;
  duration: number; // seconds
  icon: string;
  accent: string;
}

export const GAME_MODES: GameModeConfig[] = [
  {
    id: 'free',
    title: 'FREE TRAINING',
    subtitle: 'Unlimited Flow',
    description: 'Open session. No timer pressure. Focus on form and rhythm.',
    duration: 0,
    icon: '◐',
    accent: '#E8FF2A'
  },
  {
    id: 'speed',
    title: 'SPEED ROUND',
    subtitle: '60s Blitz',
    description: 'Maximum punches with accuracy. Velocity over everything.',
    duration: 60,
    icon: '⚡',
    accent: '#FF4D4D'
  },
  {
    id: 'accuracy',
    title: 'ACCURACY',
    subtitle: 'Precision',
    description: 'Hit highlighted zones. Center mass scores highest.',
    duration: 90,
    icon: '◎',
    accent: '#4DA3FF'
  },
  {
    id: 'combo',
    title: 'COMBO',
    subtitle: 'Sequence',
    description: 'Follow generated sequences. Timing windows tighten.',
    duration: 75,
    icon: '⧉',
    accent: '#A855F7'
  },
  {
    id: 'reaction',
    title: 'REACTION',
    subtitle: '0.42s avg',
    description: 'Zone lights up. React fast. Measures neural response.',
    duration: 60,
    icon: '◑',
    accent: '#22C55E'
  },
  {
    id: 'endurance',
    title: 'ENDURANCE',
    subtitle: '180s Test',
    description: 'Continuous round. Consistency and conditioning.',
    duration: 180,
    icon: '∞',
    accent: '#F97316'
  },
  {
    id: 'demo',
    title: 'DEMO MODE',
    subtitle: 'No Camera',
    description: 'Simulated tracking. Full experience without permission.',
    duration: 60,
    icon: '▶',
    accent: '#E8FF2A'
  }
];
