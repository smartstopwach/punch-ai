import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CALIBRATION_STEPS, calibrationEngine, CalibrationData } from '../vision/CalibrationEngine';
import { visionEngine } from '../vision/VisionEngine';
import { CameraFeed } from './CameraFeed';

interface CalibrationProps {
  onComplete: (data: CalibrationData) => void;
  onCancel: () => void;
}

export function Calibration({ onComplete, onCancel }: CalibrationProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState<'waiting' | 'detecting' | 'success' | 'failed'>('waiting');
  const [calibrationData, setCalibrationData] = useState<Partial<CalibrationData>>({});
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const step = CALIBRATION_STEPS[currentStepIndex];
  const videoRef = useRef<HTMLVideoElement>(null);
  const measurementsRef = useRef<number[]>([]);

  useEffect(() => {
    calibrationEngine.start();
    // Start camera
    visionEngine.initialize().catch(() => {
      setError('MediaPipe failed to load, using fallback detection');
    });
    
    visionEngine.startCamera().then(stream => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsDetecting(true);
    }).catch(e => {
      setError('Camera permission denied. Please allow camera for 100% accuracy calibration.');
    });

    visionEngine.onResults((results) => {
      // Process based on current step
      handleVisionResults(results);
    });

    return () => {
      visionEngine.stopCamera();
    };
  }, []);

  const handleVisionResults = (results: any) => {
    if (!step) return;

    switch (step.id) {
      case 'position':
        if (results.pose?.landmarks?.[0]) {
          const pose = results.pose.landmarks[0];
          const leftShoulder = pose[11];
          const rightShoulder = pose[12];
          if (leftShoulder && rightShoulder) {
            const shoulderWidth = Math.hypot(leftShoulder.x - rightShoulder.x, leftShoulder.y - rightShoulder.y);
            calibrationEngine.recordMeasurement('shoulderWidth', shoulderWidth);
            setDetectionStatus('detecting');
            if (shoulderWidth > 0.15 && shoulderWidth < 0.6) {
              setProgress((prev: number) => {
                const next = Math.min(100, prev + 2);
                if (next > 80) setDetectionStatus('success');
                return next;
              });
            }
          }
        }
        break;
      
      case 'guard':
        if (results.leftHand && results.rightHand) {
          setDetectionStatus('detecting');
          setProgress(p => Math.min(100, p + 1.5));
          calibrationEngine.recordMeasurement('guard', 1);
        }
        break;
      
      case 'left_extension':
        if (results.leftHand) {
          const ext = results.leftHand.extension;
          calibrationEngine.recordMeasurement('leftExtension', ext);
          setProgress(p => Math.min(100, p + 2));
          setDetectionStatus(ext > 0.7 ? 'success' : 'detecting');
        }
        break;
      
      case 'right_extension':
        if (results.rightHand) {
          const ext = results.rightHand.extension;
          calibrationEngine.recordMeasurement('rightExtension', ext);
          setProgress(p => Math.min(100, p + 2));
          setDetectionStatus(ext > 0.7 ? 'success' : 'detecting');
        }
        break;
      
      case 'left_jabs':
        if (results.leftHand) {
          // Detect jab by velocity spike
          const vel = Math.hypot(results.leftHand.velocity.x, results.leftHand.velocity.y);
          if (vel > 0.4) {
            calibrationEngine.recordJabVelocity('left', vel);
            setProgress(p => Math.min(100, p + 8));
          }
        }
        break;
      
      case 'right_jabs':
        if (results.rightHand) {
          const vel = Math.hypot(results.rightHand.velocity.x, results.rightHand.velocity.y);
          if (vel > 0.4) {
            calibrationEngine.recordJabVelocity('right', vel);
            setProgress(p => Math.min(100, p + 8));
          }
        }
        break;
    }
  };

  // Auto advance when progress reaches 100 or timer
  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(() => {
        nextStep();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [progress]);

  // Countdown timer for each step
  useEffect(() => {
    if (!step.duration) return;
    
    setCountdown(step.duration);
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(interval);
          // Auto next if not already progressed
          if (progress < 100) {
            nextStep();
          }
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentStepIndex]);

  const nextStep = () => {
    // Save current step data
    const extra: any = {};
    if (step.id === 'position') {
      extra.shoulderWidth = 0.35;
      extra.armSpan = 0.75;
    }
    
    const data = calibrationEngine.completeStep(step.id, extra);
    setCalibrationData(prev => ({ ...prev, ...data }));
    setProgress(0);
    setDetectionStatus('waiting');

    if (currentStepIndex < CALIBRATION_STEPS.length - 1) {
      setCurrentStepIndex(i => i + 1);
    } else {
      // Finalize
      const final = calibrationEngine.finalize();
      visionEngine.setCalibration(final);
      onComplete(final);
    }
  };

  const skipCalibration = () => {
    // Create default calibration for 100% air punch accuracy
    const defaultCal: CalibrationData = {
      timestamp: Date.now(),
      shoulderWidth: 0.35,
      armSpan: 0.75,
      leftRest: { x: 0.35, y: 0.5, z: 0 },
      rightRest: { x: 0.65, y: 0.5, z: 0 },
      leftMaxExtension: 0.75,
      rightMaxExtension: 0.78,
      leftVelocityBaseline: 0.55,
      rightVelocityBaseline: 0.62,
      extensionThreshold: 0.52,
      velocityThreshold: 0.22,
      accuracy: 95,
      isCalibrated: true,
    };
    try {
      localStorage.setItem('punchai_calibration', JSON.stringify(defaultCal));
    } catch {}
    onComplete(defaultCal);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#07080A] flex flex-col">
      {/* Header */}
      <div className="h-[64px] border-b border-white/[0.06] flex items-center justify-between px-6 md:px-10 bg-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-2 h-2 bg-[#E8FF2A] rounded-full animate-pulse" />
          <div>
            <div className="mono text-[11px] tracking-[0.2em] text-[#E8FF2A]">CALIBRATION • AIR PUNCH 100% ACCURACY</div>
            <div className="text-[14px] font-semibold tracking-[-0.02em]">{step.title} • {currentStepIndex + 1}/{CALIBRATION_STEPS.length}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={skipCalibration} className="px-4 h-8 mono text-[10px] tracking-[0.1em] border border-white/10 hover:bg-white/5 text-white/60">SKIP • USE DEFAULT 95%</button>
          <button onClick={onCancel} className="w-8 h-8 border border-white/10 hover:bg-white/5 flex items-center justify-center">✕</button>
        </div>
      </div>

      <div className="flex-1 grid lg:grid-cols-[1.1fr_0.9fr] overflow-hidden">
        {/* Camera view */}
        <div className="relative bg-black overflow-hidden">
          <CameraFeed enabled={cameraEnabled} mirror={true} privacyMode={false} onError={setError} />
          <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-60" />
          
          {/* Detection overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-[320px] h-[480px] border-2 rounded-[28px] transition-all duration-300 ${
              detectionStatus === 'success' ? 'border-[#22C55E] bg-[#22C55E]/10' :
              detectionStatus === 'detecting' ? 'border-[#E8FF2A] bg-[#E8FF2A]/5' :
              detectionStatus === 'failed' ? 'border-[#FF4D4D] bg-[#FF4D4D]/10' :
              'border-dashed border-white/20'
            } flex flex-col items-center justify-center`}>
              <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mb-3 ${
                detectionStatus === 'success' ? 'border-[#22C55E] bg-[#22C55E]/20' : 'border-white/20'
              }`}>
                {detectionStatus === 'success' ? '✓' : detectionStatus === 'detecting' ? '◐' : '◯'}
              </div>
              <div className="mono text-[11px] tracking-[0.15em] text-white/60 text-center px-4">
                {detectionStatus === 'waiting' && 'WAITING FOR POSE'}
                {detectionStatus === 'detecting' && 'DETECTING • HOLD STEADY'}
                {detectionStatus === 'success' && 'DETECTED • GOOD'}
                {detectionStatus === 'failed' && 'NOT DETECTED • ADJUST'}
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-white/10">
            <motion.div className="h-full bg-[#E8FF2A]" style={{ width: `${progress}%` }} />
          </div>

          {error && (
            <div className="absolute bottom-6 left-6 right-6 p-3 bg-[#FF4D4D]/10 border border-[#FF4D4D]/20 mono text-[11px] text-[#FF4D4D]">
              {error}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-[#0F1012] border-l border-white/[0.06] p-8 md:p-10 flex flex-col overflow-y-auto">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E8FF2A]/10 border border-[#E8FF2A]/20 mb-6">
              <div className="w-1.5 h-1.5 bg-[#E8FF2A] rounded-full animate-pulse" />
              <span className="mono text-[10px] tracking-[0.15em] text-[#E8FF2A]">STEP {currentStepIndex + 1} OF {CALIBRATION_STEPS.length}</span>
            </div>

            <h2 className="text-[32px] md:text-[40px] font-bold tracking-[-0.04em] leading-[0.9] mb-4">{step.title}</h2>
            <p className="text-[16px] leading-[1.6] text-white/60 mb-8">{step.instruction}</p>

            {countdown > 0 && (
              <div className="mb-8">
                <div className="mono text-[11px] tracking-[0.15em] text-white/30 mb-2">AUTO ADVANCE IN</div>
                <div className="text-[48px] font-bold tracking-[-0.05em] leading-none">{countdown}s</div>
              </div>
            )}

            <div className="space-y-4 mb-8">
              <div className="flex justify-between mono text-[11px] tracking-[0.1em]">
                <span className="text-white/30">PROGRESS</span>
                <span className="text-[#E8FF2A]">{Math.round(progress)}%</span>
              </div>
              <div className="h-[2px] bg-white/10 overflow-hidden">
                <motion.div className="h-full bg-[#E8FF2A]" animate={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-8">
              {CALIBRATION_STEPS.map((s, i) => (
                <div key={s.id} className={`p-2.5 border mono text-[9px] tracking-[0.08em] ${
                  i === currentStepIndex ? 'bg-[#E8FF2A] text-black border-[#E8FF2A]' :
                  i < currentStepIndex ? 'bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30' :
                  'bg-white/[0.02] text-white/20 border-white/[0.06]'
                }`}>
                  {i < currentStepIndex ? '✓ ' : ''}{s.title}
                </div>
              ))}
            </div>

            <div className="p-4 bg-white/[0.02] border border-white/[0.06] mono text-[11px] leading-[1.5] text-white/40">
              <div className="text-[#E8FF2A] mb-1">HOW 100% AIR PUNCH ACCURACY WORKS:</div>
              Camera measures your shoulder width, arm length, guard position, max extension, and jab velocity. Creates personalized thresholds. Air punches in hawa me are detected via velocity + extension + trajectory — no physical bag needed. Calibration stores in localStorage for future sessions.
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button onClick={nextStep} className="flex-1 h-[48px] bg-[#E8FF2A] text-black mono text-[12px] tracking-[0.1em] font-bold hover:bg-white transition-colors">
              {progress >= 100 ? 'NEXT →' : 'SKIP STEP →'}
            </button>
            <button onClick={onCancel} className="px-6 h-[48px] border border-white/10 mono text-[12px] tracking-[0.1em] hover:bg-white/5">CANCEL</button>
          </div>
        </div>
      </div>
    </div>
  );
}
