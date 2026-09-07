import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ThreeScene } from './three/Scene';
import { Landing } from './components/Landing';
import { HUD } from './components/HUD';
import { LoadingScreen } from './components/LoadingScreen';
import { Results } from './components/Results';
import { Statistics } from './components/Statistics';
import { SettingsPanel } from './components/SettingsPanel';
import { CameraFeed } from './components/CameraFeed';
import { GameState, PunchEvent, TargetZone, Settings, GameMode, Difficulty } from './types';
import { gameEngine } from './game/GameEngine';
import { mockEngine } from './tracking/MockEngine';
import { audioManager } from './audio/AudioManager';
import { targetMapper } from './vision/TargetMapper';
import { useLocalStorage } from './hooks/useLocalStorage';

type AppView = 'loading' | 'landing' | 'game' | 'results' | 'stats';
type GamePhase = 'idle' | 'countdown' | 'active' | 'paused' | 'ended';

function App() {
  const [view, setView] = useState<AppView>('loading');
  const [gamePhase, setGamePhase] = useState<GamePhase>('idle');
  const [countdown, setCountdown] = useState(3);
  const [gameState, setGameState] = useState<GameState>(gameEngine.getState());
  const [latestPunch, setLatestPunch] = useState<PunchEvent | null>(null);
  const [hoveredZone, setHoveredZone] = useState<TargetZone | null>(null);
  const [impacts, setImpacts] = useState<{ id: string; x: number; y: number; z: number; power: number; timestamp: number }[]>([]);
  const [latestImpact, setLatestImpact] = useState<{ zone: TargetZone; power: number; id: string } | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  const [settings, setSettings] = useLocalStorage<Settings>('punchai_settings', {
    soundEnabled: true,
    graphicsQuality: 'high',
    reducedMotion: false,
    privacyMode: false,
    mirrorCamera: true,
    targetSize: 1.0,
    difficulty: 'intermediate',
    haptics: true,
  });

  const gameModeRef = useRef<GameMode>('demo');

  // Init audio and engine bindings
  useEffect(() => {
    audioManager.init();
    audioManager.setEnabled(settings.soundEnabled);

    gameEngine.bind({
      onStateChange: (s) => setGameState(s),
      onPunch: (p) => {
        setLatestPunch(p);
        // Map to 3D position
        const zoneCfg = targetMapper.getAllZones()[p.targetZone];
        const impact3D = {
          id: p.id,
          x: (zoneCfg.x - 0.5) * 1.2 + (Math.random()-0.5)*0.1,
          y: (0.7 - zoneCfg.y) * 1.6 + (Math.random()-0.5)*0.1,
          z: 0.4,
          power: p.estimatedPower,
          timestamp: Date.now(),
        };
        setImpacts(prev => [...prev.slice(-10), impact3D]);
        setLatestImpact({ zone: p.targetZone, power: p.estimatedPower, id: p.id });

        // Audio
        if (settings.soundEnabled) {
          audioManager.punch(p.estimatedPower);
          if (p.comboIndex && p.comboIndex > 1) {
            setTimeout(() => audioManager.combo(p.comboIndex!), 120);
          }
        }

        // Haptics
        if (settings.haptics && 'vibrate' in navigator) {
          navigator.vibrate(p.estimatedPower > 75 ? 80 : 40);
        }
      },
      onRoundEnd: (s) => {
        setGamePhase('ended');
        setView('results');
        mockEngine.stop();
        if (settings.soundEnabled) audioManager.roundEnd();
      }
    });

    return () => {
      mockEngine.stop();
    };
  }, [settings.soundEnabled, settings.haptics]);

  // Countdown logic
  useEffect(() => {
    if (gamePhase !== 'countdown') return;
    if (countdown <= 0) {
      setGamePhase('active');
      if (settings.soundEnabled) audioManager.roundStart();
      // Start mock engine if demo or camera not available
      if (isDemo || !cameraEnabled) {
        mockEngine.start((punch) => {
          // Map random point to zone for accuracy
          const randomPoint = { x: 0.35 + Math.random()*0.3, y: 0.15 + Math.random()*0.55 };
          const mapped = targetMapper.map(randomPoint);
          const finalPunch: PunchEvent = {
            ...punch,
            targetZone: mapped.zone,
            accuracy: mapped.accuracy,
          };
          gameEngine.registerPunch(finalPunch);
        }, 700);
      }
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [gamePhase, countdown, isDemo, cameraEnabled, settings.soundEnabled]);

  const startGame = useCallback((mode: GameMode) => {
    gameModeRef.current = mode;
    const difficulty = settings.difficulty as Difficulty;
    const isDemoMode = mode === 'demo';
    setIsDemo(isDemoMode);
    setCameraEnabled(!isDemoMode); // try camera unless demo
    setCameraError(null);
    setLatestPunch(null);
    setImpacts([]);
    setLatestImpact(null);
    setView('game');
    setGamePhase('countdown');
    setCountdown(3);
    gameEngine.start(mode, difficulty);
  }, [settings.difficulty]);

  const handleLandingStart = (mode: GameMode) => {
    startGame(mode);
  };

  const handleRetry = () => {
    startGame(gameModeRef.current);
  };

  const handlePunchManual = () => {
    // For testing without camera: simulate punch on click/space
    if (gamePhase !== 'active') return;
    const mock = {
      id: `manual-${Date.now()}`,
      hand: (Math.random() > 0.5 ? 'right' : 'left') as any,
      type: 'cross' as any,
      timestamp: Date.now(),
      velocity: 6 + Math.random()*6,
      acceleration: 8 + Math.random()*8,
      extension: 0.7 + Math.random()*0.3,
      trajectory: [],
      targetZone: (hoveredZone || 'center_chest') as TargetZone,
      accuracy: 75 + Math.random()*25,
      estimatedPower: 50 + Math.random()*45,
    } as PunchEvent;
    const mapped = targetMapper.map({ x: 0.5 + (Math.random()-0.5)*0.2, y: 0.35 + (Math.random()-0.5)*0.2 });
    mock.targetZone = mapped.zone;
    mock.accuracy = mapped.accuracy;
    gameEngine.registerPunch(mock);
  };

  // Keyboard punch
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (view !== 'game' || gamePhase !== 'active') return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handlePunchManual();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, gamePhase, hoveredZone]);

  // Cleanup impacts
  useEffect(() => {
    const interval = setInterval(() => {
      setImpacts(prev => prev.filter(i => Date.now() - i.timestamp < 1000));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#07080A] text-white selection:bg-[#E8FF2A] selection:text-black">
      <AnimatePresence mode="wait">
        {view === 'loading' && (
          <LoadingScreen key="loading" onComplete={() => setView('landing')} />
        )}

        {view === 'landing' && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Landing
              onStart={handleLandingStart}
              onOpenStats={() => setView('stats')}
              onOpenSettings={() => setShowSettings(true)}
            />
          </motion.div>
        )}

        {view === 'game' && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative w-screen h-screen overflow-hidden bg-[#07080A]">
            {/* Camera feed background */}
            <CameraFeed enabled={cameraEnabled} mirror={settings.mirrorCamera} privacyMode={settings.privacyMode} onError={setCameraError} />

            {/* 3D Scene */}
            <div className="absolute inset-0">
              <ThreeScene
                onZoneHover={setHoveredZone}
                activeZone={gameState.activeTargetZone || hoveredZone}
                impacts={impacts}
                latestImpact={latestImpact}
                graphicsQuality={settings.graphicsQuality}
                interactive={gamePhase !== 'active'}
              />
            </div>

            {/* HUD */}
            <HUD gameState={gameState} latestPunch={latestPunch} isDemo={isDemo} />

            {/* Manual punch area - invisible but clickable for demo */}
            <button
              onClick={handlePunchManual}
              className="absolute inset-0 z-10 cursor-crosshair opacity-0"
              aria-label="Punch"
            />

            {/* Countdown overlay */}
            <AnimatePresence>
              {gamePhase === 'countdown' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 bg-[#07080A]/70 backdrop-blur-[12px] flex flex-col items-center justify-center">
                  <div className="text-center">
                    <div className="mono text-[12px] tracking-[0.3em] text-white/40 mb-6">GET READY</div>
                    <motion.div
                      key={countdown}
                      initial={{ scale: 1.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="text-[140px] font-bold tracking-[-0.06em] leading-none"
                    >
                      {countdown === 0 ? 'GO' : countdown}
                    </motion.div>
                    <div className="mt-8 mono text-[11px] tracking-[0.15em] text-white/30">
                      {isDemo ? 'DEMO MODE • SIMULATED TRACKING' : cameraEnabled ? 'CAMERA TRACKING • MOVE INTO FRAME' : 'MANUAL MODE • CLICK OR PRESS SPACE'}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Top controls */}
            <div className="absolute top-[72px] left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
              <button onClick={() => { gameEngine.pause(); setGamePhase('paused'); }} className="px-3 h-8 bg-black/60 border border-white/10 mono text-[10px] tracking-[0.1em] hover:bg-white/10">PAUSE</button>
              <button onClick={() => { mockEngine.stop(); setView('landing'); setGamePhase('idle'); }} className="px-3 h-8 bg-black/60 border border-white/10 mono text-[10px] tracking-[0.1em] hover:bg-white/10">EXIT</button>
            </div>

            {/* Camera error */}
            {cameraError && (
              <div className="absolute top-[112px] left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-[#FF4D4D]/10 border border-[#FF4D4D]/20 mono text-[11px] tracking-[0.05em] text-[#FF4D4D] max-w-[90vw] text-center">
                {cameraError}
              </div>
            )}

            {/* Punch feedback */}
            <AnimatePresence>
              {latestPunch && gamePhase === 'active' && (
                <motion.div
                  key={latestPunch.id}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 1.1 }}
                  transition={{ duration: 0.35, ease: [0.22,1,0.36,1] }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
                >
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/80 border border-white/10 backdrop-blur-xl">
                      <div className={`w-2 h-2 rounded-full ${latestPunch.hand==='right' ? 'bg-[#E8FF2A]' : 'bg-white'} animate-pulse`} />
                      <span className="mono text-[13px] tracking-[0.1em] font-bold">
                        {latestPunch.hand.toUpperCase()} {latestPunch.type.replace('_',' ').toUpperCase()}
                      </span>
                      <span className="mono text-[11px] text-white/50">•</span>
                      <span className="mono text-[12px] text-[#E8FF2A]">{latestPunch.estimatedPower}</span>
                    </div>
                    <div className="mt-2 mono text-[10px] tracking-[0.15em] text-white/40">
                      {latestPunch.targetZone.replace('_',' ').toUpperCase()} • {latestPunch.accuracy}% ACC • {latestPunch.velocity} M/S
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mobile punch buttons */}
            <div className="absolute bottom-[88px] left-0 right-0 z-20 flex justify-center gap-3 md:hidden">
              <button onTouchStart={handlePunchManual} onClick={handlePunchManual} className="w-[72px] h-[72px] rounded-full bg-white/10 border border-white/20 backdrop-blur-xl active:bg-white active:text-black flex flex-col items-center justify-center gap-1">
                <span className="mono text-[10px] tracking-[0.1em]">LEFT</span>
                <span className="text-[18px]">◀</span>
              </button>
              <button onTouchStart={handlePunchManual} onClick={handlePunchManual} className="w-[72px] h-[72px] rounded-full bg-[#E8FF2A]/20 border border-[#E8FF2A]/30 backdrop-blur-xl active:bg-[#E8FF2A] active:text-black flex flex-col items-center justify-center gap-1">
                <span className="mono text-[10px] tracking-[0.1em]">RIGHT</span>
                <span className="text-[18px]">▶</span>
              </button>
            </div>

            {/* Pause overlay */}
            {gamePhase === 'paused' && (
              <div className="absolute inset-0 z-30 bg-[#07080A]/80 backdrop-blur-[16px] flex items-center justify-center">
                <div className="text-center border border-white/10 bg-[#0F1012] p-8 min-w-[320px]">
                  <div className="mono text-[11px] tracking-[0.2em] text-white/30 mb-4">PAUSED</div>
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => { gameEngine.resume(); setGamePhase('active'); }} className="h-10 px-6 bg-[#E8FF2A] text-black mono text-[12px] tracking-[0.1em] font-semibold">RESUME</button>
                    <button onClick={() => { mockEngine.stop(); setView('landing'); setGamePhase('idle'); }} className="h-10 px-6 border border-white/15 mono text-[12px] tracking-[0.1em]">EXIT</button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {view === 'results' && (
          <Results
            key="results"
            state={gameState}
            onRetry={handleRetry}
            onChangeMode={() => { setView('landing'); setGamePhase('idle'); }}
            onStats={() => setView('stats')}
            onHome={() => { setView('landing'); setGamePhase('idle'); }}
          />
        )}

        {view === 'stats' && (
          <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Statistics onClose={() => setView('landing')} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings */}
      <AnimatePresence>
        {showSettings && (
          <SettingsPanel settings={settings} onChange={setSettings} onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>

      {/* Tooltip for power */}
      <div className="fixed bottom-3 right-3 z-50 hidden md:flex items-center gap-2 px-3 py-1.5 bg-black/60 border border-white/10 backdrop-blur-xl mono text-[9px] tracking-[0.1em] text-white/30">
        <span className="w-1 h-1 bg-[#E8FF2A] rounded-full" />
        POWER = VISUAL ESTIMATE • NOT NEWTONS • SENSOR READY ARCHITECTURE
      </div>
    </div>
  );
}

export default App;
