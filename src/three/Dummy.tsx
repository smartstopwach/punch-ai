import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TargetZone } from '../types';

interface DummyProps {
  onHitZoneHover?: (zone: TargetZone | null) => void;
  activeZone?: TargetZone | null;
  impact?: { zone: TargetZone; power: number; id: string } | null;
  scale?: number;
}

export function Dummy({ onHitZoneHover, activeZone, impact, scale = 1 }: DummyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const torsoGroupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState<TargetZone | null>(null);
  const sway = useRef({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });
  const breath = useRef(0);

  // Exact reference materials - premium black graphite rubber
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#101214',
    roughness: 0.34,
    metalness: 0.06,
  }), []);

  const chestMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#131517',
    roughness: 0.30,
    metalness: 0.08,
  }), []);

  const baseMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#08090B',
    roughness: 0.65,
    metalness: 0.03,
  }), []);

  const baseTopMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0C0D0F',
    roughness: 0.55,
    metalness: 0.05,
  }), []);

  // Hit zones tuned to exact dummy proportions
  const zones3D: Record<TargetZone, { pos: [number, number, number]; size: [number, number, number] }> = {
    head: { pos: [0, 1.50, 0.10], size: [0.50, 0.56, 0.50] },
    left_temple: { pos: [-0.19, 1.52, 0.12], size: [0.16, 0.20, 0.16] },
    right_temple: { pos: [0.19, 1.52, 0.12], size: [0.16, 0.20, 0.16] },
    upper_chest: { pos: [0, 0.90, 0.26], size: [0.88, 0.44, 0.42] },
    center_chest: { pos: [0, 0.50, 0.30], size: [0.82, 0.52, 0.46] },
    left_rib: { pos: [-0.40, 0.45, 0.18], size: [0.30, 0.38, 0.30] },
    right_rib: { pos: [0.40, 0.45, 0.18], size: [0.30, 0.38, 0.30] },
    abdomen: { pos: [0, 0.05, 0.26], size: [0.66, 0.44, 0.38] },
    center_body: { pos: [0, 0.52, 0.22], size: [1.05, 1.55, 0.52] },
  };

  useEffect(() => {
    if (!impact) return;
    const pf = impact.power / 100;
    const zone = zones3D[impact.zone];
    sway.current.vx += zone.pos[0] * pf * 0.30;
    sway.current.vz += -pf * 0.85;
    sway.current.vy += (Math.random() - 0.5) * pf * 0.05;
  }, [impact]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    breath.current += delta * 0.6;
    const b = Math.sin(breath.current) * 0.004;

    if (torsoGroupRef.current) {
      torsoGroupRef.current.scale.set(1 + b, 1 + b * 0.25, 1 + b);
    }

    const s = sway.current;
    const stiffness = 2.8;
    const damping = 0.94;

    s.vx += -s.x * stiffness * delta;
    s.vy += -s.y * stiffness * delta;
    s.vz += -s.z * stiffness * delta;
    s.vx *= damping;
    s.vy *= damping;
    s.vz *= damping;
    s.x += s.vx * delta * 9;
    s.y += s.vy * delta * 9;
    s.z += s.vz * delta * 9;

    // Clamp to prevent wild swings - stability
    s.x = Math.max(-0.35, Math.min(0.35, s.x));
    s.z = Math.max(-0.45, Math.min(0.15, s.z));

    groupRef.current.rotation.x = s.z * 0.28;
    groupRef.current.rotation.z = -s.x * 0.22;
    groupRef.current.rotation.y = s.x * 0.12 + Math.sin(state.clock.elapsedTime * 0.12) * 0.01;
    groupRef.current.position.y = s.y * 0.5 - 0.30;
  });

  return (
    <group ref={groupRef} scale={scale} position={[0, -0.30, 0]}>
      {/* === HEAVY BASE - exact like reference === */}
      {/* Bottom heavy cylinder */}
      <mesh position={[0, -0.92, 0]} material={baseMat} castShadow receiveShadow>
        <cylinderGeometry args={[0.80, 0.86, 0.70, 32]} />
      </mesh>
      {/* Top step of base */}
      <mesh position={[0, -0.50, 0]} material={baseTopMat} castShadow receiveShadow>
        <cylinderGeometry args={[0.64, 0.80, 0.20, 32]} />
      </mesh>
      {/* Handle indent on base front */}
      <mesh position={[0, -0.78, 0.70]} material={baseMat}>
        <boxGeometry args={[0.16, 0.06, 0.03]} />
      </mesh>

      {/* === LOWER BAG / SKIRT - black fabric with pleats like reference === */}
      <group position={[0, -0.12, 0]}>
        <mesh material={bodyMat} castShadow receiveShadow>
          <cylinderGeometry args={[0.44, 0.50, 0.68, 24]} />
        </mesh>
        {/* Vertical pleats - 10 folds to match reference image */}
        {Array.from({ length: 10 }).map((_, i) => {
          const angle = (i / 10) * Math.PI * 2;
          const r = 0.47;
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]}
              rotation={[0, -angle, 0]}
              material={bodyMat}
              castShadow
            >
              <boxGeometry args={[0.04, 0.66, 0.015]} />
            </mesh>
          );
        })}
      </group>

      {/* === TORSO - human silhouette exact === */}
      <group ref={torsoGroupRef} position={[0, 0.55, 0.04]}>
        {/* Abdomen - lower torso */}
        <mesh position={[0, -0.28, 0.06]} material={bodyMat} castShadow receiveShadow>
          <cylinderGeometry args={[0.36, 0.40, 0.50, 20]} />
        </mesh>

        {/* Waist to chest transition */}
        <mesh position={[0, 0.05, 0.08]} material={bodyMat} castShadow receiveShadow>
          <cylinderGeometry args={[0.40, 0.36, 0.45, 20]} />
        </mesh>

        {/* Chest - main */}
        <mesh position={[0, 0.38, 0.10]} material={chestMat} castShadow receiveShadow>
          <cylinderGeometry args={[0.46, 0.40, 0.55, 22]} />
        </mesh>

        {/* Pectoral volume - left/right */}
        <mesh position={[-0.18, 0.45, 0.22]} material={chestMat} castShadow>
          <sphereGeometry args={[0.26, 16, 12]} />
        </mesh>
        <mesh position={[0.18, 0.45, 0.22]} material={chestMat} castShadow>
          <sphereGeometry args={[0.26, 16, 12]} />
        </mesh>

        {/* Shoulders */}
        <mesh position={[-0.46, 0.58, 0.02]} material={bodyMat} castShadow>
          <sphereGeometry args={[0.22, 16, 12]} />
        </mesh>
        <mesh position={[0.46, 0.58, 0.02]} material={bodyMat} castShadow>
          <sphereGeometry args={[0.22, 16, 12]} />
        </mesh>

        {/* Neck */}
        <mesh position={[0, 0.88, 0.00]} material={bodyMat} castShadow>
          <cylinderGeometry args={[0.14, 0.18, 0.28, 16]} />
        </mesh>
      </group>

      {/* === HEAD - exact human head like reference === */}
      <group position={[0, 1.48, 0.04]}>
        <mesh material={bodyMat} castShadow receiveShadow>
          <sphereGeometry args={[0.26, 22, 18]} />
        </mesh>
        {/* Face - slightly forward */}
        <mesh position={[0, 0.02, 0.14]} material={chestMat} castShadow>
          <sphereGeometry args={[0.21, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        </mesh>
        {/* Nose hint */}
        <mesh position={[0, 0.01, 0.24]} material={bodyMat}>
          <sphereGeometry args={[0.05, 8, 8]} />
        </mesh>
      </group>

      {/* === INVISIBLE HIT ZONES === */}
      {Object.entries(zones3D).map(([zone, cfg]) => {
        if (zone === 'center_body') return null;
        return (
          <mesh
            key={zone}
            position={cfg.pos as any}
            onPointerEnter={() => {
              setHovered(zone as TargetZone);
              onHitZoneHover?.(zone as TargetZone);
            }}
            onPointerLeave={() => {
              setHovered(null);
              onHitZoneHover?.(null);
            }}
          >
            <boxGeometry args={cfg.size as any} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        );
      })}

      {/* === HIGHLIGHT === */}
      {(hovered || activeZone) && (
        <group>
          <mesh position={zones3D[(hovered || activeZone) as TargetZone].pos as any}>
            <sphereGeometry args={[0.18, 14, 10]} />
            <meshStandardMaterial
              color={activeZone ? '#E8FF2A' : '#FFFFFF'}
              emissive={activeZone ? '#E8FF2A' : '#FFFFFF'}
              emissiveIntensity={activeZone ? 1.0 : 0.15}
              transparent
              opacity={activeZone ? 0.30 : 0.10}
            />
          </mesh>
          <mesh
            position={[
              zones3D[(hovered || activeZone) as TargetZone].pos[0],
              zones3D[(hovered || activeZone) as TargetZone].pos[1],
              zones3D[(hovered || activeZone) as TargetZone].pos[2] + 0.22,
            ]}
          >
            <ringGeometry args={[0.10, 0.125, 20]} />
            <meshBasicMaterial
              color={activeZone ? '#E8FF2A' : '#FFFFFF'}
              transparent
              opacity={activeZone ? 0.85 : 0.20}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}
