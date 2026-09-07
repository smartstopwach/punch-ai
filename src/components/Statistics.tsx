import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { generateSessionStats } from '../data/mockData';

export function Statistics({ onClose }: { onClose: () => void }) {
  const stats = useMemo(() => generateSessionStats(), []);

  return (
    <div className="min-h-screen bg-[#07080A] text-white">
      <header className="h-[64px] border-b border-white/[0.06] flex items-center justify-between px-6 md:px-10">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="w-8 h-8 border border-white/10 hover:bg-white/5 flex items-center justify-center">←</button>
          <div>
            <div className="mono text-[11px] tracking-[0.2em] text-white/30">ANALYTICS</div>
            <div className="text-[18px] font-semibold tracking-[-0.02em]">STATISTICS • MOCK DATA</div>
          </div>
        </div>
        <div className="mono text-[10px] tracking-[0.15em] text-white/30">LOCAL STORAGE • PRIVACY FIRST</div>
      </header>

      <div className="max-w-[1400px] mx-auto p-6 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left charts */}
        <div className="lg:col-span-8 space-y-6">
          {/* Power over time */}
          <div className="border border-white/[0.08] bg-[#0F1012] p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="mono text-[11px] tracking-[0.15em] text-white/40">ESTIMATED POWER OVER TIME</div>
              <div className="mono text-[10px] text-[#E8FF2A]">CAMERA ESTIMATE 0-100</div>
            </div>
            <div className="h-[180px] flex items-end gap-[3px]">
              {stats.powerHistory.map((v, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${v}%` }}
                  transition={{ delay: i * 0.015 }}
                  className="flex-1 bg-gradient-to-t from-white/10 to-[#E8FF2A]/60 hover:to-[#E8FF2A] transition-colors"
                  style={{ minWidth: 4 }}
                />
              ))}
            </div>
            <div className="mt-4 flex justify-between mono text-[10px] text-white/20">
              <span>SESSION START</span>
              <span>NOW</span>
            </div>
          </div>

          {/* Punches per round */}
          <div className="border border-white/[0.08] bg-[#0F1012] p-6">
            <div className="mono text-[11px] tracking-[0.15em] text-white/40 mb-6">PUNCHES PER ROUND</div>
            <div className="space-y-3">
              {stats.punches.map(r => (
                <div key={r.round} className="flex items-center gap-4">
                  <div className="w-12 mono text-[10px] text-white/30">R{r.round.toString().padStart(2,'0')}</div>
                  <div className="flex-1 h-[28px] bg-white/[0.04] border border-white/[0.06] relative overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(r.count/80)*100}%` }} className="absolute inset-y-0 left-0 bg-white/80" />
                    <div className="absolute inset-0 flex items-center px-3 mono text-[11px] tracking-[0.05em]">{r.count} punches • {r.power} PWR • {r.accuracy}% ACC</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right metrics */}
        <div className="lg:col-span-4 space-y-6">
          <div className="border border-white/[0.08] bg-[#0F1012] p-6">
            <div className="mono text-[11px] tracking-[0.15em] text-white/40 mb-6">LEFT / RIGHT BALANCE</div>
            <div className="flex gap-2 h-[120px]">
              <div className="flex-1 flex flex-col justify-end">
                <div className="mono text-[10px] text-white/30 mb-2 text-center">LEFT 48%</div>
                <div className="bg-white/10 border border-white/10 relative" style={{ height: '68%' }}>
                  <div className="absolute bottom-0 left-0 right-0 bg-white h-[48%]" />
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-end">
                <div className="mono text-[10px] text-[#E8FF2A]/70 mb-2 text-center">RIGHT 52%</div>
                <div className="bg-white/10 border border-white/10 relative" style={{ height: '72%' }}>
                  <div className="absolute bottom-0 left-0 right-0 bg-[#E8FF2A] h-[52%]" />
                </div>
              </div>
            </div>
          </div>

          <div className="border border-white/[0.08] bg-[#0F1012] p-6">
            <div className="mono text-[11px] tracking-[0.15em] text-white/40 mb-4">REACTION TIME</div>
            <div className="space-y-2">
              {stats.reactionHistory.slice(0,6).map((rt, i) => (
                <div key={i} className="flex justify-between mono text-[11px]">
                  <span className="text-white/30">#{i+1}</span>
                  <span className="text-white">{rt.toFixed(2)}s</span>
                  <span className={`px-2 py-0.5 text-[9px] ${rt < 0.35 ? 'bg-[#22C55E]/20 text-[#22C55E]' : rt < 0.5 ? 'bg-[#E8FF2A]/20 text-[#E8FF2A]' : 'bg-white/10 text-white/40'}`}>{rt < 0.35 ? 'FAST' : rt < 0.5 ? 'AVG' : 'SLOW'}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-white/[0.06] mono text-[10px] text-white/30">Avg: {(stats.reactionHistory.reduce((a,b)=>a+b,0)/stats.reactionHistory.length).toFixed(2)}s • Best: {Math.min(...stats.reactionHistory).toFixed(2)}s</div>
          </div>

          <div className="border border-[#E8FF2A]/20 bg-[#E8FF2A]/[0.04] p-5">
            <div className="mono text-[10px] tracking-[0.15em] text-[#E8FF2A] mb-2">FUTURE SENSOR PATH</div>
            <div className="mono text-[11px] leading-[1.5] text-[#E8FF2A]/70">
              Smart gloves • Pressure sensors • Instrumented bag<br />
              SensorInput → Calibration → ForceMeasurement → PowerScore<br />
              Currently: Camera-based estimate only.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
