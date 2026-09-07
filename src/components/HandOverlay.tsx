import { useEffect, useRef } from 'react';
import { MediaPipeResults } from '../vision/VisionEngine';

interface HandOverlayProps {
  results: MediaPipeResults | null;
  width: number;
  height: number;
  mirror?: boolean;
}

export function HandOverlay({ results, width, height, mirror = true }: HandOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, width, height);

    if (!results) return;

    // Draw pose skeleton
    if (results.pose?.landmarks?.[0]) {
      const pose = results.pose.landmarks[0];
      const connections = [
        [11, 12], // shoulders
        [11, 13], [13, 15], // left arm
        [12, 14], [14, 16], // right arm
        [11, 23], [12, 24], [23, 24], // torso
      ];

      ctx.strokeStyle = 'rgba(232, 255, 42, 0.6)';
      ctx.lineWidth = 2;
      connections.forEach(([a, b]) => {
        const p1 = pose[a];
        const p2 = pose[b];
        if (p1 && p2 && p1.visibility > 0.4 && p2.visibility > 0.4) {
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

      // Draw pose points
      [11, 12, 13, 14, 15, 16].forEach(idx => {
        const p = pose[idx];
        if (p && p.visibility > 0.4) {
          const x = mirror ? (1 - p.x) * width : p.x * width;
          const y = p.y * height;
          ctx.fillStyle = idx === 15 || idx === 16 ? '#E8FF2A' : '#FFFFFF';
          ctx.beginPath();
          ctx.arc(x, y, idx === 15 || idx === 16 ? 6 : 4, 0, Math.PI * 2);
          ctx.fill();
          
          // Glow for wrists
          if (idx === 15 || idx === 16) {
            ctx.fillStyle = 'rgba(232, 255, 42, 0.3)';
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
    }

    // Draw hand landmarks
    const drawHand = (landmarks: any[], isLeft: boolean) => {
      if (!landmarks || landmarks.length === 0) return;

      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4], // thumb
        [0, 5], [5, 6], [6, 7], [7, 8], // index
        [0, 9], [9, 10], [10, 11], [11, 12], // middle
        [0, 13], [13, 14], [14, 15], [15, 16], // ring
        [0, 17], [17, 18], [18, 19], [19, 20], // pinky
        [5, 9], [9, 13], [13, 17], // palm
      ];

      // Lines
      ctx.strokeStyle = isLeft ? 'rgba(255, 255, 255, 0.8)' : 'rgba(232, 255, 42, 0.9)';
      ctx.lineWidth = 1.5;
      connections.forEach(([a, b]) => {
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

      // Points
      landmarks.forEach((p: any, i: number) => {
        const x = mirror ? (1 - p.x) * width : p.x * width;
        const y = p.y * height;
        const isTip = [4, 8, 12, 16, 20].includes(i);
        const isWrist = i === 0;
        
        ctx.fillStyle = isWrist ? '#E8FF2A' : isTip ? '#FFFFFF' : isLeft ? 'rgba(255,255,255,0.6)' : 'rgba(232,255,42,0.7)';
        ctx.beginPath();
        ctx.arc(x, y, isWrist ? 5 : isTip ? 3.5 : 2, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    // Note: hand landmarks from results are in HandTracking.landmarks
    // We need to get them from results.leftHand/rightHand
    if (results.leftHand?.landmarks && results.leftHand.landmarks.length > 0) {
      drawHand(results.leftHand.landmarks, true);
    }
    if (results.rightHand?.landmarks && results.rightHand.landmarks.length > 0) {
      drawHand(results.rightHand.landmarks, false);
    }
  }, [results, width, height, mirror]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ transform: mirror ? 'scaleX(-1)' : 'none' }}
    />
  );
}
