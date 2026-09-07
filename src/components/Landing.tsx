import { motion } from 'framer-motion';
import { ThreeScene } from '../three/Scene';
import { GAME_MODES } from '../data/gameModes';
import { TargetZone } from '../types';
import { useState } from 'react';

interface LandingProps {
  onStart: (mode: any) => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
}

export function Landing({ onStart, onOpenStats, onOpenSettings }: LandingProps) {
  const [hoveredZone, setHoveredZone] = useState<TargetZone | null>(null);

  return (
    <div className="min-h-screen bg-[#07080A] text-white relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(90%_80%_at_50%_0%,#1E2028_0%,#121316_30%,#07080A_70%)]" />
        <div className="absolute inset-0 grid-subtle opacity-[0.03]" />
        {/* Large soft spotlight */}
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,rgba(232,255,42,0.08)_0%,transparent_60%)] blur-[40px]" />
      </div>

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-6 md:px-10 h-[72px] border-b border-white/[0.06]">
        <div className="flex items-center gap-8">
          <div className="flex items-baseline gap-2">
            <span className="text-[20px] font-bold tracking-[-0.03em]">PUNCH</span>
            <span className="text-[20px] font-light text-white/30">//</span>
            <span className="text-[20px] font-bold tracking-[-0.03em]">AI</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[10px] mono tracking-[0.15em] text-white/30">
            <span className="w-1 h-1 bg-[#22C55E] rounded-full animate-pulse" />
            VISION READY
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onOpenStats} className="px-4 h-9 mono text-[11px] tracking-[0.1em] border border-white/10 hover:border-white/20 hover:bg-white/[0.04] transition-colors">STATISTICS</button>
          <button onClick={onOpenSettings} className="px-4 h-9 mono text-[11px] tracking-[0.1em] border border-white/10 hover:border-white/20 hover:bg-white/[0.04] transition-colors">SETTINGS</button>
        </div>
      </header>

      {/* Hero */}
      <div className="relative z-10 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] min-h-[calc(100vh-72px)]">
        {/* Left content */}
        <div className="px-6 md:px-10 lg:px-16 py-12 lg:py-20 flex flex-col justify-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22,1,0.36,1] }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] mb-8">
              <div className="w-1.5 h-1.5 bg-[#E8FF2A] rounded-full animate-pulse" />
              <span className="mono text-[10px] tracking-[0.15em] text-white/70">CAMERA • LOCAL PROCESSING • NO UPLOAD</span>
            </div>

            <h1 className="text-[56px] md:text-[84px] lg:text-[92px] font-bold tracking-[-0.05em] leading-[0.88] uppercase">
              REAL-TIME<br />
              <span className="text-white/20">BOXING</span><br />
              INTERACTION
            </h1>

            <p className="mt-6 max-w-[520px] text-[16px] md:text-[18px] leading-[1.6] text-white/50 font-light">
              Browser-based vision tracking. Punch a premium 3D dummy. Estimated power, accuracy, and combo intelligence — no sensors required. Architecture ready for hardware force calibration.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <button onClick={() => onStart('demo')} className="group relative h-[52px] px-8 bg-[#E8FF2A] text-black font-semibold tracking-[-0.01em] overflow-hidden">
                <span className="relative z-10 flex items-center gap-3">
                  TRY DEMO
                  <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                </span>
                <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </button>
              <button onClick={() => onStart('free')} className="h-[52px] px-8 border border-white/15 hover:border-white/30 hover:bg-white/[0.04] mono text-[13px] tracking-[0.1em] transition-colors">
                START TRAINING
              </button>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-6 max-w-[440px] border-t border-white/[0.06] pt-6">
              {[
                { k: 'TRACKING', v: 'Left/Right Hand • Velocity • Extension' },
                { k: 'POWER', v: 'Camera-based estimate 0-100 • Not Newtons' },
                { k: 'PRIVACY', v: 'On-device • No video stored' },
              ].map(item => (
                <div key={item.k}>
                  <div className="mono text-[10px] tracking-[0.15em] text-white/30 mb-1">{item.k}</div>
                  <div className="text-[11px] leading-[1.4] text-white/60">{item.v}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Game modes */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-16">
            <div className="mono text-[11px] tracking-[0.2em] text-white/30 mb-4">TRAINING MODES</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {GAME_MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => onStart(m.id)}
                  className="group text-left p-4 bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/15 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[18px]">{m.icon}</span>
                    <span className="mono text-[9px] tracking-[0.1em] text-white/30">{m.duration ? `${m.duration}s` : '∞'}</span>
                  </div>
                  <div className="mono text-[11px] tracking-[0.08em] font-medium group-hover:text-[#E8FF2A] transition-colors">{m.title}</div>
                  <div className="mono text-[10px] text-white/30 mt-1">{m.subtitle}</div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right - 3D */}
        <div className="relative lg:border-l border-white/[0.06] min-h-[600px] lg:min-h-0">
          <div className="absolute inset-0">
            <ThreeScene onZoneHover={setHoveredZone} interactive={true} graphicsQuality="high" />
          </div>

          {/* Overlay info */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
            <div className="flex items-end justify-between">
              <div>
                <div className="mono text-[10px] tracking-[0.2em] text-white/30 mb-2">TARGET INSPECT</div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-[#E8FF2A] rounded-full animate-pulse" />
                  </div>
                  <div>
                    <div className="text-[14px] font-medium tracking-[-0.01em]">{hoveredZone ? hoveredZone.replace('_',' ').toUpperCase() : 'HOVER ZONES'}</div>
                    <div className="mono text-[11px] text-white/40">Drag to rotate • Scroll to zoom • Premium graphite dummy</div>
                  </div>
                </div>
              </div>
              <div className="hidden md:block text-right">
                <div className="mono text-[10px] tracking-[0.15em] text-white/20">ESTIMATED POWER</div>
                <div className="mono text-[10px] text-white/30 mt-1 max-w-[200px] leading-[1.4]">Camera cannot measure real Newtons. Power is visual estimate from velocity, extension, accuracy.</div>
              </div>
            </div>
          </div>

          {/* Floating stats */}
          <div className="absolute top-8 right-8 hidden lg:flex flex-col gap-2 pointer-events-none">
            {[
              { label: 'VELOCITY', value: '8.4 m/s' },
              { label: 'EXTENSION', value: '0.87' },
              { label: 'ACCURACY', value: '91%' },
            ].map(s => (
              <div key={s.label} className="px-3 py-2 bg-black/60 backdrop-blur-xl border border-white/[0.08] mono text-[10px]">
                <div className="text-white/30 tracking-[0.1em]">{s.label}</div>
                <div className="text-white tracking-[0.05em] mt-0.5">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <section className="relative z-10 border-t border-white/[0.06] bg-[#0A0B0D]">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10 lg:px-16 py-16 md:py-24 grid md:grid-cols-4 gap-8">
          {[
            { step: '01', title: 'CAMERA FEED', desc: 'WebRTC getUserMedia. Local processing only. No video leaves device.' },
            { step: '02', title: 'HAND TRACKING', desc: 'MediaPipe Hand Landmarker + Pose. Smoothing with One Euro Filter.' },
            { step: '03', title: 'PUNCH DETECTION', desc: 'State machine: IDLE → READY → MOVING → EXTENDING → IMPACT → RECOVERY.' },
            { step: '04', title: 'IMPACT ESTIMATE', desc: 'Weighted: velocity 42%, extension 28%, trajectory 14%, accuracy 10%, consistency 6%.' },
          ].map(item => (
            <div key={item.step} className="border-l border-white/10 pl-6">
              <div className="mono text-[11px] tracking-[0.2em] text-[#E8FF2A] mb-3">{item.step}</div>
              <div className="text-[14px] font-medium tracking-[-0.01em] mb-2">{item.title}</div>
              <div className="text-[13px] leading-[1.5] text-white/40">{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Safety */}
      <div className="relative z-10 border-t border-white/[0.06] px-6 md:px-10 lg:px-16 py-6 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-black/20">
        <p className="mono text-[10px] leading-[1.6] tracking-[0.05em] text-white/30 max-w-[720px]">
          SAFETY: Train within your comfort level. Use appropriate boxing equipment and adequate space. Stop if you feel pain, dizziness, or unusual discomfort. Do not punch harder just to increase a score. This is a training visualization, not a combat instruction.
        </p>
        <div className="mono text-[10px] tracking-[0.15em] text-white/20">PUNCH//AI © 2026 — FUTURE HARDWARE READY</div>
      </div>
    </div>
  );
}
