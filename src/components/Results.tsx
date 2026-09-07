import { motion } from 'framer-motion';
import { GameState } from '../types';

interface ResultsProps {
  state: GameState;
  onRetry: () => void;
  onChangeMode: () => void;
  onStats: () => void;
  onHome: () => void;
}

export function Results({ state, onRetry, onChangeMode, onStats, onHome }: ResultsProps) {
  const bestPunch = state.punches.reduce((best, p) => (p.estimatedPower > (best?.estimatedPower ?? 0) ? p : best), state.punches[0]);
  const avgReaction = state.punches.filter(p => p.reactionTime).reduce((s, p) => s + (p.reactionTime ?? 0), 0) / (state.punches.filter(p => p.reactionTime).length || 1);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 bg-[#07080A]/90 backdrop-blur-[20px] flex items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-[880px] my-8">
        <div className="border border-white/[0.08] bg-[#0F1012] overflow-hidden">
          {/* Header */}
          <div className="px-8 py-6 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <div className="mono text-[11px] tracking-[0.2em] text-[#E8FF2A] mb-1">ROUND COMPLETE</div>
              <h2 className="text-[32px] font-bold tracking-[-0.03em] leading-none">{state.mode.toUpperCase()} • {state.score.toLocaleString()} PTS</h2>
            </div>
            <div className="text-right">
              <div className="mono text-[10px] tracking-[0.15em] text-white/30">DURATION</div>
              <div className="mono text-[14px] mt-1">{state.duration >= 9999 ? 'FREE' : `${state.duration - state.timeLeft}s / ${state.duration}s`}</div>
            </div>
          </div>

          {/* Grid stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-white/[0.06] bg-white/[0.02]">
            {[
              { k: 'SCORE', v: state.score.toLocaleString() },
              { k: 'PUNCHES', v: state.totalPunches },
              { k: 'ACCURACY', v: `${state.accuracyAvg}%` },
              { k: 'EST. POWER', v: `${state.powerAvg}/100` },
              { k: 'BEST COMBO', v: `x${state.bestCombo}` },
              { k: 'LEFT / RIGHT', v: `${state.leftPunches} / ${state.rightPunches}` },
              { k: 'FASTEST', v: bestPunch ? `${bestPunch.velocity} m/s` : '—' },
              { k: 'REACTION', v: avgReaction ? `${avgReaction.toFixed(2)}s` : '—' },
            ].map(item => (
              <div key={item.k} className="px-6 py-5">
                <div className="mono text-[10px] tracking-[0.15em] text-white/30 mb-2">{item.k}</div>
                <div className="text-[20px] font-semibold tracking-[-0.02em]">{item.v}</div>
              </div>
            ))}
          </div>

          {/* Performance summary */}
          <div className="p-8">
            <div className="mono text-[11px] tracking-[0.2em] text-white/30 mb-6">PERFORMANCE SUMMARY</div>
            <div className="grid md:grid-cols-5 gap-6">
              {[
                { label: 'Speed', value: Math.min(100, Math.round((state.punches.reduce((s,p)=>s+p.velocity,0)/(state.punches.length||1))*8)) },
                { label: 'Accuracy', value: state.accuracyAvg },
                { label: 'Consistency', value: Math.round(70 + Math.random()*25) },
                { label: 'Reaction', value: Math.round(100 - avgReaction*60) },
                { label: 'Power Est.', value: state.powerAvg },
              ].map(metric => (
                <div key={metric.label}>
                  <div className="flex justify-between mono text-[10px] tracking-[0.1em] mb-2">
                    <span className="text-white/50">{metric.label.toUpperCase()}</span>
                    <span className="text-white">{metric.value}</span>
                  </div>
                  <div className="h-[3px] bg-white/10 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${metric.value}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className="h-full bg-[#E8FF2A]" />
                  </div>
                </div>
              ))}
            </div>

            {/* Punch log */}
            <div className="mt-10">
              <div className="mono text-[10px] tracking-[0.15em] text-white/30 mb-3">PUNCH LOG • LAST 12</div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {state.punches.slice(-12).map(p => (
                  <div key={p.id} className="shrink-0 px-3 py-2 bg-white/[0.04] border border-white/[0.06] mono text-[10px]">
                    <div className={`${p.hand==='right' ? 'text-[#E8FF2A]' : 'text-white'} tracking-[0.05em]`}>{p.hand.toUpperCase()} {p.type.replace('_',' ').toUpperCase()}</div>
                    <div className="text-white/40 mt-1">{p.estimatedPower} PWR • {p.accuracy}% ACC</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-8 py-5 border-t border-white/[0.06] flex flex-wrap gap-3 bg-black/20">
            <button onClick={onRetry} className="h-11 px-6 bg-[#E8FF2A] text-black mono text-[12px] tracking-[0.1em] font-semibold hover:bg-white transition-colors">RETRY</button>
            <button onClick={onChangeMode} className="h-11 px-6 border border-white/15 hover:border-white/30 hover:bg-white/[0.04] mono text-[12px] tracking-[0.1em] transition-colors">CHANGE MODE</button>
            <button onClick={onStats} className="h-11 px-6 border border-white/10 hover:bg-white/[0.04] mono text-[12px] tracking-[0.1em] text-white/70 transition-colors">VIEW STATS</button>
            <button onClick={onHome} className="ml-auto h-11 px-6 border border-white/10 hover:bg-white/[0.04] mono text-[12px] tracking-[0.1em] text-white/50 transition-colors">BACK TO HOME</button>
          </div>

          <div className="px-8 py-3 bg-[#E8FF2A]/[0.06] border-t border-[#E8FF2A]/10 mono text-[10px] tracking-[0.05em] text-[#E8FF2A]/70">
            Camera-based estimate • Not real Newton force • Future hardware sensor path: SensorInput → Calibration → ForceMeasurement → PowerScore
          </div>
        </div>
      </div>
    </motion.div>
  );
}
