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
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);

  const [hovered, setHovered] = useState<TargetZone | null>(null);
  const sway = useRef({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });
  const breath = useRef(0);

  // Premium materials — match reference black graphite rubber
  const rubberMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#0D0E10',
    roughness: 0.28,
    metalness: 0.08,
    clearcoat: 0.6,
    clearcoatRoughness: 0.35,
    sheen: 0.15,
    sheenColor: '#222326',
  }), []);

  const skinMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#121316',
    roughness: 0.32,
    metalness: 0.06,
    clearcoat: 0.4,
    clearcoatRoughness: 0.4,
  }), []);

  const baseMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#060708',
    roughness: 0.62,
    metalness: 0.05,
  }), []);

  const baseTopMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0A0B0D',
    roughness: 0.5,
    metalness: 0.08,
  }), []);

  // 3D hit zones — tuned to reference dummy proportions
  const zones3D: Record<TargetZone, { pos: [number, number, number]; size: [number, number, number] }> = {
    head: { pos: [0, 1.52, 0.12], size: [0.52, 0.6, 0.52] },
    left_temple: { pos: [-0.20, 1.55, 0.14], size: [0.18, 0.22, 0.18] },
    right_temple: { pos: [0.20, 1.55, 0.14], size: [0.18, 0.22, 0.18] },
    upper_chest: { pos: [0, 0.92, 0.28], size: [0.92, 0.48, 0.45] },
    center_chest: { pos: [0, 0.52, 0.32], size: [0.88, 0.55, 0.48] },
    left_rib: { pos: [-0.42, 0.48, 0.20], size: [0.32, 0.42, 0.32] },
    right_rib: { pos: [0.42, 0.48, 0.20], size: [0.32, 0.42, 0.32] },
    abdomen: { pos: [0, 0.08, 0.28], size: [0.70, 0.48, 0.40] },
    center_body: { pos: [0, 0.55, 0.25], size: [1.1, 1.6, 0.55] },
  };

  useEffect(() => {
    if (!impact) return;
    const pf = impact.power / 100;
    const zone = zones3D[impact.zone];
    const dirX = zone.pos[0] * 0.45;
    const dirZ = -pf * 0.75;
    sway.current.vx += dirX * pf * 0.28;
    sway.current.vz += dirZ * 0.95;
    sway.current.vy += (Math.random() - 0.5) * pf * 0.06;

    // head reaction for head shots
    if (impact.zone.includes('head') || impact.zone.includes('temple')) {
      if (headRef.current) {
        headRef.current.rotation.x += (Math.random() - 0.5) * pf * 0.15;
      }
    }
  }, [impact]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    breath.current += delta * 0.85;
    const b = Math.sin(breath.current) * 0.007;

    if (torsoRef.current) {
      torsoRef.current.scale.set(1 + b, 1 + b * 0.4, 1 + b);
      torsoRef.current.position.y = Math.sin(breath.current * 0.7) * 0.008;
    }

    const s = sway.current;
    const stiffness = 3.2;
    const damping = 0.91;

    s.vx += -s.x * stiffness * delta;
    s.vy += -s.y * stiffness * delta;
    s.vz += -s.z * stiffness * delta;

    s.vx *= damping;
    s.vy *= damping;
    s.vz *= damping;

    s.x += s.vx * delta * 11;
    s.y += s.vy * delta * 11;
    s.z += s.vz * delta * 11;

    groupRef.current.rotation.x = s.z * 0.38;
    groupRef.current.rotation.z = -s.x * 0.32;
    groupRef.current.rotation.y = s.x * 0.18 + Math.sin(state.clock.elapsedTime * 0.18) * 0.018;
    groupRef.current.position.y = s.y - 0.35;
  });

  return (
    <group ref={groupRef} scale={scale} position={[0, -0.35, 0]}>
      {/* === HEAVY BASE === */}
      <mesh position={[0, -0.95, 0]} material={baseMaterial} castShadow receiveShadow>
        <cylinderGeometry args={[0.82, 0.88, 0.72, 36]} />
      </mesh>
      {/* Base top step - matches reference cylindrical heavy base */}
      <mesh position={[0, -0.52, 0]} material={baseTopMaterial} castShadow receiveShadow>
        <cylinderGeometry args={[0.68, 0.82, 0.22, 36]} />
      </mesh>
      {/* Base handle indent - visual */}
      <mesh position={[0, -0.78, 0.72]} rotation={[0, 0, 0]} material={baseMaterial}>
        <boxGeometry args={[0.18, 0.08, 0.04]} />
      </mesh>

      {/* === LOWER BAG / SKIRT SECTION (pleated) === */}
      <group position={[0, -0.12, 0]}>
        {/* Main lower cylinder - black fabric covering like reference */}
        <mesh material={rubberMaterial} castShadow receiveShadow>
          <cylinderGeometry args={[0.46, 0.52, 0.72, 24, 1, false]} />
        </mesh>
        {/* Pleated details - 8 vertical folds */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const x = Math.cos(angle) * 0.49;
          const z = Math.sin(angle) * 0.49;
          return (
            <mesh key={i} position={[x, 0, z]} rotation={[0, -angle, 0]} material={rubberMaterial} castShadow>
              <boxGeometry args={[0.06, 0.70, 0.02]} />
            </mesh>
          );
        })}
        {/* Brand logo plane - INVINCIBLE vertical */}
        <group position={[0, 0.05, 0.47]} rotation={[0, 0, 0]}>
          <mesh>
            <planeGeometry args={[0.08, 0.32]} />
            <meshStandardMaterial color="#E8E8E8" transparent opacity={0.08} />
          </mesh>
        </group>
      </group>

      {/* === TORSO === */}
      <group ref={torsoRef} position={[0, 0.58, 0.06]}>
        {/* Core torso capsule - muscular */}
        <mesh material={rubberMaterial} castShadow receiveShadow>
          <capsuleGeometry args={[0.44, 0.72, 10, 20]} />
        </mesh>

        {/* Chest - upper pectoral volume */}
        <mesh position={[0, 0.28, 0.18]} material={skinMaterial} castShadow>
          <sphereGeometry args={[0.48, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        </mesh>

        {/* Abs definition - subtle */}
        <mesh position={[0, -0.08, 0.22]} material={rubberMaterial} castShadow>
          <capsuleGeometry args={[0.32, 0.42, 6, 12]} />
        </mesh>

        {/* Shoulders - deltoids */}
        <mesh position={[-0.48, 0.42, 0.04]} material={skinMaterial} castShadow>
          <sphereGeometry args={[0.24, 18, 18]} />
        </mesh>
        <mesh position={[0.48, 0.42, 0.04]} material={skinMaterial} castShadow>
          <sphereGeometry args={[0.24, 18, 18]} />
        </mesh>

        {/* Lats under shoulders */}
        <mesh position={[-0.42, 0.15, -0.05]} material={rubberMaterial} castShadow>
          <sphereGeometry args={[0.22, 14, 14]} />
        </mesh>
        <mesh position={[0.42, 0.15, -0.05]} material={rubberMaterial} castShadow>
          <sphereGeometry args={[0.22, 14, 14]} />
        </mesh>

        {/* Neck */}
        <mesh position={[0, 0.72, 0.02]} material={skinMaterial} castShadow>
          <cylinderGeometry args={[0.16, 0.20, 0.30, 18]} />
        </mesh>

        {/* Collar bone hint */}
        <mesh position={[0, 0.62, 0.12]} material={skinMaterial}>
          <torusGeometry args={[0.28, 0.04, 8, 20, Math.PI]} />
        </mesh>
      </group>

      {/* === HEAD === */}
      <group position={[0, 1.58, 0.06]}>
        <mesh ref={headRef} material={skinMaterial} castShadow receiveShadow>
          <sphereGeometry args={[0.28, 26, 22]} />
        </mesh>
        {/* Face front - slightly darker */}
        <mesh position={[0, 0.02, 0.18]} material={new THREE.MeshStandardMaterial({ color: '#1A1C1E', roughness: 0.38, metalness: 0.05 })}>
          <sphereGeometry args={[0.23, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
        </mesh>
        {/* Ears */}
        <mesh position={[-0.27, 0, 0]} material={skinMaterial}>
          <sphereGeometry args={[0.06, 10, 10]} />
        </mesh>
        <mesh position={[0.27, 0, 0]} material={skinMaterial}>
          <sphereGeometry args={[0.06, 10, 10]} />
        </mesh>
        {/* Nose bridge */}
        <mesh position={[0, 0.02, 0.26]} material={skinMaterial}>
          <capsuleGeometry args={[0.04, 0.12, 4, 8]} />
        </mesh>
      </group>

      {/* === INTERACTION ZONES (invisible) === */}
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
            <sphereGeometry args={[zones3D[(hovered || activeZone) as TargetZone].size[0] * 0.58, 16, 12]} />
            <meshStandardMaterial
              color={activeZone ? '#E8FF2A' : '#FFFFFF'}
              emissive={activeZone ? '#E8FF2A' : '#FFFFFF'}
              emissiveIntensity={activeZone ? 1.2 : 0.18}
              transparent
              opacity={activeZone ? 0.28 : 0.09}
            />
          </mesh>
          {/* Ring highlight */}
          <mesh position={[zones3D[(hovered || activeZone) as TargetZone].pos[0], zones3D[(hovered || activeZone) as TargetZone].pos[1], zones3D[(hovered || activeZone) as TargetZone].pos[2] + 0.18]}>
            <ringGeometry args={[0.12, 0.14, 24]} />
            <meshBasicMaterial color={activeZone ? '#E8FF2A' : '#FFFFFF'} transparent opacity={activeZone ? 0.9 : 0.25} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* Subtle ground reflection plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.31, 0]} receiveShadow>
        <planeGeometry args={[3.5, 3.5]} />
        <meshStandardMaterial color="#0A0A0B" roughness={0.15} metalness={0.5} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
