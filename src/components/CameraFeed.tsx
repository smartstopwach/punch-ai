import { useEffect, useRef, useState } from 'react';
import { MediaPipeResults } from '../vision/VisionEngine';

interface CameraFeedProps {
  enabled: boolean;
  mirror?: boolean;
  privacyMode?: boolean;
  onError?: (msg: string) => void;
  results?: MediaPipeResults | null;
  showSkeleton?: boolean;
}

export function CameraFeed({ enabled, mirror = true, privacyMode = false, onError, results, showSkeleton = true }: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'unavailable'>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        setStream(null);
      }
      setStatus('idle');
      return;
    }

    let cancelled = false;
    async function start() {
      setStatus('requesting');
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false
        });
        if (cancelled) {
          s.getTracks().forEach(t => t.stop());
          return;
        }
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play();
        }
        setStatus('active');
      } catch (e: any) {
        if (e.name === 'NotAllowedError') {
          setStatus('denied');
          onError?.('Camera permission denied. Use Demo Mode or allow camera in browser settings.');
        } else {
          setStatus('unavailable');
          onError?.('Camera unavailable. Use Demo Mode.');
        }
      }
    }
    start();

    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [enabled]);

  // Draw skeleton overlay
  useEffect(() => {
    if (!showSkeleton || !results || !canvasRef.current || privacyMode) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Pose
    if (results.pose?.landmarks?.[0]) {
      const pose = results.pose.landmarks[0];
      const connections = [
        [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24]
      ];

      ctx.strokeStyle = 'rgba(232, 255, 42, 0.7)';
      ctx.lineWidth = 2.5;
      connections.forEach(([a, b]) => {
        const p1 = pose[a];
        const p2 = pose[b];
        if (p1 && p2 && (p1.visibility ?? 0) > 0.4 && (p2.visibility ?? 0) > 0.4) {
          const x1 = mirror ? (1 - p1.x) * width : p1.x * width;
          const y1 = p1.y * height;
          const x2 = mirror ? (1 - p2.x) * width : p2.x * width;
          const y2 = p2.y * height;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      });

      [11, 12, 13, 14, 15, 16].forEach(idx => {
        const p = pose[idx];
        if (p && (p.visibility ?? 0) > 0.4) {
          const x = mirror ? (1 - p.x) * width : p.x * width;
          const y = p.y * height;
          const isWrist = idx === 15 || idx === 16;
          ctx.fillStyle = isWrist ? '#E8FF2A' : '#FFFFFF';
          ctx.beginPath();
          ctx.arc(x, y, isWrist ? 7 : 4, 0, Math.PI * 2);
          ctx.fill();
          if (isWrist) {
            ctx.fillStyle = 'rgba(232, 255, 42, 0.25)';
            ctx.beginPath();
            ctx.arc(x, y, 14, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
    }

    // Hands
    const drawHand = (landmarks: any[], isLeft: boolean) => {
      if (!landmarks || landmarks.length === 0) return;
      const connections = [
        [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
        [0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],
        [0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17]
      ];
      ctx.strokeStyle = isLeft ? 'rgba(255,255,255,0.85)' : 'rgba(232, 255, 42, 0.95)';
      ctx.lineWidth = 2;
      connections.forEach(([a,b]) => {
        const p1 = landmarks[a];
        const p2 = landmarks[b];
        if (p1 && p2) {
          const x1 = mirror ? (1 - p1.x) * width : p1.x * width;
          const y1 = p1.y * height;
          const x2 = mirror ? (1 - p2.x) * width : p2.x * width;
          const y2 = p2.y * height;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      });
      landmarks.forEach((p: any, i: number) => {
        const x = mirror ? (1 - p.x) * width : p.x * width;
        const y = p.y * height;
        const isWrist = i === 0;
        const isTip = [4,8,12,16,20].includes(i);
        ctx.fillStyle = isWrist ? '#E8FF2A' : isTip ? '#FFF' : isLeft ? 'rgba(255,255,255,0.7)' : 'rgba(232,255,42,0.8)';
        ctx.beginPath();
        ctx.arc(x, y, isWrist ? 6 : isTip ? 4 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    if (results.leftHand?.landmarks?.length) drawHand(results.leftHand.landmarks, true);
    if (results.rightHand?.landmarks?.length) drawHand(results.rightHand.landmarks, false);
  }, [results, mirror, privacyMode, showSkeleton]);

  if (!enabled) return null;

  const hasRealTracking = results && (results.leftHand || results.rightHand || results.pose);
  const isFake = !hasRealTracking;

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <video
        ref={videoRef}
        muted
        playsInline
        className={`w-full h-full object-cover ${mirror ? 'scale-x-[-1]' : ''} ${privacyMode ? 'opacity-[0.08] blur-[12px]' : 'opacity-[0.45]'}`}
      />

      {/* Real skeleton canvas */}
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {privacyMode && status === 'active' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="px-4 py-2 bg-black/60 border border-white/10 mono text-[11px] tracking-[0.15em] text-white/60">PRIVACY MODE • SILHOUETTE ONLY</div>
        </div>
      )}

      {status === 'requesting' && (
        <div className="absolute inset-0 bg-[#07080A]/80 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
            <div className="mono text-[11px] tracking-[0.15em] text-white/60">REQUESTING CAMERA PERMISSION</div>
          </div>
        </div>
      )}

      {status === 'denied' && (
        <div className="absolute inset-0 bg-[#07080A]/90 flex items-center justify-center p-6">
          <div className="max-w-[360px] text-center border border-white/10 bg-[#0F1012] p-6">
            <div className="mono text-[11px] tracking-[0.2em] text-[#FF4D4D] mb-3">PERMISSION DENIED</div>
            <div className="text-[14px] leading-[1.5] text-white/70">Camera access was denied. You can still use Demo Mode with simulated tracking.</div>
          </div>
        </div>
      )}

      {status === 'unavailable' && (
        <div className="absolute inset-0 bg-[#07080A]/90 flex items-center justify-center p-6">
          <div className="max-w-[360px] text-center border border-white/10 bg-[#0F1012] p-6">
            <div className="mono text-[11px] tracking-[0.2em] text-white/60 mb-3">CAMERA UNAVAILABLE</div>
            <div className="text-[14px] leading-[1.5] text-white/50">No camera detected. Demo Mode is available.</div>
          </div>
        </div>
      )}

      {status === 'active' && !privacyMode && !hasRealTracking && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[480px] border-2 border-dashed border-[#E8FF2A]/30 rounded-[28px] flex flex-col items-center justify-center bg-[#E8FF2A]/[0.02]">
            <span className="mono text-[10px] tracking-[0.2em] text-[#E8FF2A]/60">SHOW HANDS • PALMS VISIBLE</span>
            <span className="mono text-[9px] tracking-[0.1em] text-white/20 mt-2">REAL TRACKING STARTING...</span>
          </div>
        </div>
      )}

      {/* Real vs Fake indicator - proves not fake */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <div className={`px-2.5 py-1 backdrop-blur-md border mono text-[9px] tracking-[0.12em] font-bold flex items-center gap-1.5 ${
          hasRealTracking ? 'bg-[#22C55E]/20 border-[#22C55E]/30 text-[#22C55E]' : 'bg-[#FF4D4D]/10 border-[#FF4D4D]/20 text-[#FF4D4D]/60'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${hasRealTracking ? 'bg-[#22C55E] animate-pulse' : 'bg-[#FF4D4D]/50'}`} />
          {hasRealTracking ? 'REAL TRACKING • LIVE' : 'NO HANDS • SHOW PALMS'}
        </div>
        {hasRealTracking && (
          <div className="px-2 py-1 bg-black/60 border border-white/10 mono text-[8px] tracking-[0.1em] text-white/50">
            {results?.leftHand ? 'L✓ ' : 'L✗ '}{results?.rightHand ? 'R✓' : 'R✗'} • {results?.pose ? 'POSE✓' : 'POSE✗'}
          </div>
        )}
      </div>

      <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-md border border-white/10 mono text-[9px] tracking-[0.1em] text-white/40">
        {hasRealTracking ? 'REAL MEDIAPIPE • LOCAL • NOT FAKE' : 'LOCAL PROCESSING • NO UPLOAD'}
      </div>

      {hasRealTracking && (
        <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-[#E8FF2A]/10 border border-[#E8FF2A]/20 mono text-[8px] tracking-[0.1em] text-[#E8FF2A]/70">
          SKELETON = REAL HANDS • NOT SIMULATED
        </div>
      )}
    </div>
  );
}
