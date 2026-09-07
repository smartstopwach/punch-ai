import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const steps = [
  '3D ENGINE',
  'TRACKING',
  'TARGET SYSTEM',
  'AUDIO',
  'VISION',
  'GAME LOGIC'
];

export function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        const next = p + Math.random()*18;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 400);
          return 100;
        }
        const stepIdx = Math.floor((next/100)*steps.length);
        setCurrentStep(Math.min(stepIdx, steps.length-1));
        return next;
      });
    }, 120);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#07080A] flex flex-col items-center justify-center px-6"
    >
      {/* Subtle grid */}
      <div className="absolute inset-0 grid-subtle opacity-[0.04]" />

      <div className="relative w-full max-w-[560px]">
        {/* Logo */}
        <div className="mb-16">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[42px] font-bold tracking-[-0.04em] leading-none">PUNCH</h1>
            <span className="text-[42px] font-light tracking-[-0.04em] leading-none text-white/30">//</span>
            <h1 className="text-[42px] font-bold tracking-[-0.04em] leading-none">AI</h1>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-[1px] w-12 bg-white/20" />
            <p className="mono text-[10px] tracking-[0.2em] text-white/40 uppercase">Real-time Boxing Interaction</p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <span className="mono text-[11px] tracking-[0.15em] text-white/60">INITIALIZING VISION ENGINE</span>
            <span className="mono text-[11px] text-[#E8FF2A]">{Math.round(progress)}%</span>
          </div>
          <div className="h-[2px] w-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full bg-[#E8FF2A]"
              style={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="mt-10 grid grid-cols-2 gap-3">
          {steps.map((s, i) => {
            const isDone = i < currentStep || progress === 100;
            const isActive = i === currentStep;
            return (
              <div key={s} className="flex items-center gap-3">
                <div className={`w-[14px] h-[14px] border flex items-center justify-center transition-all ${isDone ? 'bg-[#E8FF2A] border-[#E8FF2A]' : isActive ? 'border-white/40' : 'border-white/10'}`}>
                  {isDone && <span className="text-[8px] text-black font-bold">✓</span>}
                </div>
                <span className={`mono text-[10px] tracking-[0.12em] ${isDone ? 'text-white' : isActive ? 'text-white/70' : 'text-white/20'}`}>{s}</span>
                <span className="ml-auto mono text-[9px] text-white/20">{isDone ? 'READY' : isActive ? '...' : ''}</span>
              </div>
            );
          })}
        </div>

        {/* System ready */}
        {progress === 100 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-12 flex items-center gap-3">
            <div className="w-2 h-2 bg-[#22C55E] rounded-full animate-pulse" />
            <span className="mono text-[11px] tracking-[0.2em] text-[#22C55E]">SYSTEM READY</span>
          </motion.div>
        )}
      </div>

      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <p className="mono text-[9px] tracking-[0.2em] text-white/20 uppercase">Local Processing • No Video Upload • Privacy First</p>
      </div>
    </motion.div>
  );
}
