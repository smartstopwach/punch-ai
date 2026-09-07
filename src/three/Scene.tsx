import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Float } from '@react-three/drei';
import { Suspense, useState } from 'react';
import { Dummy } from './Dummy';
import { ImpactEffects } from './ImpactEffects';
import { TargetZone } from '../types';
import * as THREE from 'three';

interface SceneProps {
  onZoneHover?: (z: TargetZone | null) => void;
  activeZone?: TargetZone | null;
  impacts?: { id: string; x: number; y: number; z: number; power: number; timestamp: number }[];
  latestImpact?: { zone: TargetZone; power: number; id: string } | null;
  interactive?: boolean;
  graphicsQuality?: 'low' | 'medium' | 'high' | 'ultra';
}

export function ThreeScene({ onZoneHover, activeZone, impacts = [], latestImpact = null, interactive = true, graphicsQuality = 'high' }: SceneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dpr = graphicsQuality === 'low' ? 1 : graphicsQuality === 'medium' ? 1.25 : graphicsQuality === 'high' ? 1.5 : 2;
  const shadows = graphicsQuality !== 'low';

  return (
    <div className="w-full h-full relative">
      <Canvas
        dpr={dpr}
        shadows={shadows}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
        onPointerDown={() => setIsDragging(true)}
        onPointerUp={() => setIsDragging(false)}
      >
        <PerspectiveCamera makeDefault position={[0, 0.65, 2.9]} fov={36} />
        <fog attach="fog" args={['#07080A', 3.5, 8]} />
        <Suspense fallback={null}>
          {/* Studio lighting — premium commercial look */}
          <ambientLight intensity={0.28} color="#8A8F98" />
          <directionalLight position={[2.5, 3.5, 2.2]} intensity={1.35} castShadow={shadows} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0002} />
          <directionalLight position={[-2.2, 1.2, -1.2]} intensity={0.35} color="#4DA3FF" />
          <spotLight position={[0, 3.2, 1.8]} angle={0.38} penumbra={0.65} intensity={2.6} castShadow={shadows} color="#FFF8E8" decay={1} distance={6} />
          <pointLight position={[0, 0.6, 1.6]} intensity={0.9} distance={3.2} color="#E8FF2A" decay={2} />
          <pointLight position={[0, -0.8, 0.5]} intensity={0.4} distance={2.5} color="#FFFFFF" />

          {/* Subtle float for breathing room */}
          <Float speed={0.6} rotationIntensity={0.04} floatIntensity={0.08} floatingRange={[-0.02, 0.02]}>
            <Dummy onHitZoneHover={onZoneHover} activeZone={activeZone} impact={latestImpact} scale={1.05} />
          </Float>

          <ImpactEffects impacts={impacts} />

          {/* Floor — matte dark with slight reflection */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.32, 0]} receiveShadow>
            <planeGeometry args={[10, 10]} />
            <meshStandardMaterial color="#090A0B" roughness={0.88} metalness={0.04} />
          </mesh>

          {/* Contact shadow for grounding */}
          <ContactShadows position={[0, -1.31, 0]} opacity={0.55} scale={5} blur={2.8} far={2.2} color="#000000" />

          {/* Studio environment reflections */}
          <Environment preset="studio" environmentIntensity={0.35} />

          {interactive && (
            <OrbitControls
              enablePan={false}
              enableZoom={true}
              minDistance={1.9}
              maxDistance={4.4}
              minPolarAngle={Math.PI * 0.36}
              maxPolarAngle={Math.PI * 0.61}
              minAzimuthAngle={-0.65}
              maxAzimuthAngle={0.65}
              autoRotate={!isDragging}
              autoRotateSpeed={0.35}
              target={[0, 0.45, 0]}
              enableDamping
              dampingFactor={0.08}
            />
          )}
        </Suspense>
      </Canvas>

      {/* Premium vignette + spotlight */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(85%_75%_at_50%_18%,transparent_32%,rgba(0,0,0,0.55)_88%)]" />
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06)_0%,transparent_60%)] blur-[30px]" />
        <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(232,255,42,0.07)_0%,transparent_55%)] blur-[35px]" />
      </div>

      {/* Subtle grid */}
      <div className="absolute bottom-0 left-0 right-0 h-[42%] pointer-events-none opacity-[0.035] grid-subtle" />

      {/* Scanline hint for futuristic */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.015] bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,white_2px,white_3px)]" />
    </div>
  );
}
