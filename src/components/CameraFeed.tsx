import { useEffect, useRef, useState } from 'react';

interface CameraFeedProps {
  enabled: boolean;
  mirror?: boolean;
  privacyMode?: boolean;
  onError?: (msg: string) => void;
}

export function CameraFeed({ enabled, mirror = true, privacyMode = false, onError }: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {/* Video */}
      <video
        ref={videoRef}
        muted
        playsInline
        className={`w-full h-full object-cover ${mirror ? 'scale-x-[-1]' : ''} ${privacyMode ? 'opacity-[0.08] blur-[12px]' : 'opacity-[0.35]'}`}
      />

      {/* Privacy overlay */}
      {privacyMode && status === 'active' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="px-4 py-2 bg-black/60 border border-white/10 mono text-[11px] tracking-[0.15em] text-white/60">PRIVACY MODE • SILHOUETTE ONLY</div>
        </div>
      )}

      {/* Status overlays */}
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
            <div className="mt-4 mono text-[10px] text-white/30">Allow camera in browser settings to use real tracking.</div>
          </div>
        </div>
      )}

      {status === 'unavailable' && (
        <div className="absolute inset-0 bg-[#07080A]/90 flex items-center justify-center p-6">
          <div className="max-w-[360px] text-center border border-white/10 bg-[#0F1012] p-6">
            <div className="mono text-[11px] tracking-[0.2em] text-white/60 mb-3">CAMERA UNAVAILABLE</div>
            <div className="text-[14px] leading-[1.5] text-white/50">No camera detected or it is in use by another app. Demo Mode is available.</div>
          </div>
        </div>
      )}

      {/* Skeleton overlay hint */}
      {status === 'active' && !privacyMode && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[480px] border border-dashed border-white/10 rounded-[24px] flex items-center justify-center">
            <span className="mono text-[9px] tracking-[0.2em] text-white/20">PLAYER DETECTION AREA</span>
          </div>
        </div>
      )}

      {/* Privacy notice */}
      <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-md border border-white/10 mono text-[9px] tracking-[0.1em] text-white/40">
        LOCAL PROCESSING • NO UPLOAD
      </div>
    </div>
  );
}
