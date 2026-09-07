import { motion, AnimatePresence } from 'framer-motion';
import { GameState, PunchEvent } from '../types';

interface HUDProps {
  gameState: GameState;
  latestPunch?: PunchEvent | null;
  isDemo?: boolean;
}

export function HUD({ gameState, latestPunch, isDemo }: HUDProps) {
  const formatTime = (s: number) => {
    if (s >= 9999) return '∞';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-[64px] border-b border-white/[0.06] bg-gradient-to-b from-black/40 to-transparent backdrop-blur-[2px] flex items-center justify-between px-6 md:px-10">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-[2px] h-7 bg-[#E8FF2A]" />
            <div>
              <div className="mono text-[10px] tracking-[0.2em] text-white/40">ROUND</div>
              <div className="text-[18px] font-semibold tracking-[-0.02em] leading-none mt-0.5">0{gameState.round}</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="w-px h-7 bg-white/10" />
            <div>
              <div className="mono text-[10px] tracking-[0.2em] text-white/40">MODE</div>
              <div className="mono text-[12px] tracking-[0.1em] uppercase mt-0.5">{gameState.mode}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="mono text-[10px] tracking-[0.2em] text-white/40">TIME</div>
            <div className="mono text-[22px] font-medium tracking-[-0.02em] leading-none mt-0.5 tabular-nums">
              {formatTime(gameState.timeLeft)}
            </div>
          </div>
          <div className={`w-2 h-2 rounded-full ${gameState.isActive ? 'bg-[#22C55E] animate-pulse' : 'bg-white/20'}`} />
        </div>
      </div>

      {/* Left Stats */}
      <div className="absolute left-6 md:left-10 top-[88px] space-y-6">
        <div>
          <div className="mono text-[10px] tracking-[0.2em] text-white/30 mb-1.5">SCORE</div>
          <div className="flex items-baseline gap-1">
            <motion.div key={gameState.score} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-[36px] font-semibold tracking-[-0.03em] leading-none tabular-nums">
              {gameState.score.toLocaleString()}
            </motion.div>
          </div>
          <div className="mt-2 h-[2px] w-[120px] bg-white/10 overflow-hidden">
            <motion.div className="h-full bg-white" style={{ width: `${Math.min(100, (gameState.score % 1000)/10)}%` }} />
          </div>
        </div>

        <div>
          <div className="mono text-[10px] tracking-[0.2em] text-white/30 mb-1.5">COMBO</div>
          <AnimatePresence mode="wait">
            <motion.div
              key={gameState.combo}
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className={`text-[42px] font-bold tracking-[-0.04em] leading-none ${gameState.combo > 3 ? 'text-[#E8FF2A]' : 'text-white'}`}
            >
              x{gameState.combo}
            </motion.div>
          </AnimatePresence>
          {gameState.combo > 1 && (
            <div className="mt-1 mono text-[10px] tracking-[0.1em] text-[#E8FF2A]/70">STREAK ACTIVE</div>
          )}
        </div>

        <div className="hidden md:block pt-4 border-t border-white/[0.06] space-y-2">
          <div className="flex justify-between w-[140px] mono text-[10px] tracking-[0.1em]">
            <span className="text-white/30">PUNCHES</span>
            <span className="text-white tabular-nums">{gameState.totalPunches}</span>
          </div>
          <div className="flex justify-between w-[140px] mono text-[10px] tracking-[0.1em]">
            <span className="text-white/30">L / R</span>
            <span className="text-white tabular-nums">{gameState.leftPunches} / {gameState.rightPunches}</span>
          </div>
        </div>
      </div>

      {/* Right Stats */}
      <div className="absolute right-6 md:right-10 top-[88px] text-right space-y-6">
        <div>
          <div className="mono text-[10px] tracking-[0.2em] text-white/30 mb-1.5">EST. POWER</div>
          <div className="flex items-baseline justify-end gap-1">
            <div className="text-[32px] font-semibold tracking-[-0.02em] leading-none tabular-nums">{latestPunch?.estimatedPower ?? gameState.powerAvg ?? 0}</div>
            <div className="mono text-[11px] text-white/40">/100</div>
          </div>
          <div className="mt-2 ml-auto w-[100px] h-[2px] bg-white/10 overflow-hidden">
            <motion.div className="h-full bg-[#E8FF2A]" animate={{ width: `${latestPunch?.estimatedPower ?? gameState.powerAvg ?? 0}%` }} />
          </div>
          <div className="mt-1 mono text-[8px] tracking-[0.1em] text-white/20 uppercase">Camera Estimate</div>
        </div>

        <div>
          <div className="mono text-[10px] tracking-[0.2em] text-white/30 mb-1.5">ACCURACY</div>
          <div className="flex items-baseline justify-end gap-1">
            <div className="text-[28px] font-semibold tracking-[-0.02em] leading-none tabular-nums">{latestPunch?.accuracy ?? gameState.accuracyAvg ?? 0}</div>
            <div className="mono text-[11px] text-white/40">%</div>
          </div>
          <div className="mt-2 ml-auto w-[100px] h-[3px] rounded-full bg-white/10 overflow-hidden flex">
            <motion.div className="h-full bg-white" animate={{ width: `${latestPunch?.accuracy ?? gameState.accuracyAvg ?? 0}%` }} />
          </div>
        </div>

        {latestPunch && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="pt-4 border-t border-white/[0.06]">
            <div className="mono text-[9px] tracking-[0.15em] text-white/30 mb-1">LAST</div>
            <div className="mono text-[11px] tracking-[0.1em] uppercase">{latestPunch.hand} {latestPunch.type.replace('_',' ')}</div>
            <div className="mono text-[10px] text-white/40 mt-0.5">{latestPunch.targetZone.replace('_',' ')} • {latestPunch.velocity} m/s</div>
          </motion.div>
        )}
      </div>

      {/* Bottom Hands */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-full bg-black/60 border border-white/[0.08] backdrop-blur-xl">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full transition-colors ${latestPunch?.hand === 'left' ? 'bg-white text-black' : 'bg-white/5 text-white/60'}`}>
          <div className="w-1.5 h-1.5 rounded-full bg-current" />
          <span className="mono text-[10px] tracking-[0.1em] font-medium">LEFT</span>
        </div>
        <div className="w-px h-4 bg-white/10" />
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full transition-colors ${latestPunch?.hand === 'right' ? 'bg-[#E8FF2A] text-black' : 'bg-white/5 text-white/60'}`}>
          <span className="mono text-[10px] tracking-[0.1em] font-medium">RIGHT</span>
          <div className="w-1.5 h-1.5 rounded-full bg-current" />
        </div>
        {isDemo && <div className="ml-2 pl-3 border-l border-white/10 mono text-[9px] tracking-[0.15em] text-white/30">DEMO SIM</div>}
      </div>

      {/* Active zone indicator */}
      {gameState.activeTargetZone && (
        <div className="absolute top-[120px] left-1/2 -translate-x-1/2">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="px-4 py-2 bg-[#E8FF2A] text-black mono text-[11px] tracking-[0.15em] font-bold">
            HIT: {gameState.activeTargetZone.replace('_',' ').toUpperCase()}
          </motion.div>
        </div>
      )}
    </div>
  );
}
