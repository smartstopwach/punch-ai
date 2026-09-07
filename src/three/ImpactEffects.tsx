import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Impact {
  id: string;
  x: number;
  y: number;
  z: number;
  power: number;
  timestamp: number;
}

interface ImpactEffectsProps {
  impacts: Impact[];
}

function ImpactRing({ impact }: { impact: Impact }) {
  const ref = useRef<THREE.Mesh>(null);
  const age = useRef(0);

  useFrame((_, delta) => {
    if (!ref.current) return;
    age.current += delta;
    const progress = age.current / 0.6; // 600ms
    if (progress > 1) {
      ref.current.visible = false;
      return;
    }
    ref.current.scale.setScalar(0.2 + progress * 1.8 * (impact.power / 50));
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - progress);
    ref.current.rotation.z += delta * 2;
  });

  return (
    <mesh ref={ref} position={[impact.x, impact.y, impact.z + 0.15]}>
      <ringGeometry args={[0.08, 0.12, 24]} />
      <meshBasicMaterial color={impact.power > 75 ? '#E8FF2A' : '#FFFFFF'} transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
}

function ParticleBurst({ impact }: { impact: Impact }) {
  const pointsRef = useRef<THREE.Points>(null);
  const velocities = useMemo(() => {
    return Array.from({ length: 24 }, () => ({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: Math.random() * 1.2,
      life: Math.random()
    }));
  }, []);

  const positions = useMemo(() => {
    const arr = new Float32Array(24 * 3);
    for (let i=0;i<24;i++) {
      arr[i*3] = impact.x;
      arr[i*3+1] = impact.y;
      arr[i*3+2] = impact.z;
    }
    return arr;
  }, [impact.x, impact.y, impact.z]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const pos = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    for (let i=0;i<24;i++) {
      const v = velocities[i];
      pos.setX(i, pos.getX(i) + v.x * delta * (impact.power/30));
      pos.setY(i, pos.getY(i) + v.y * delta * (impact.power/30));
      pos.setZ(i, pos.getZ(i) + v.z * delta * (impact.power/30));
      v.life -= delta * 2.5;
    }
    pos.needsUpdate = true;
    const mat = pointsRef.current.material as THREE.PointsMaterial;
    mat.opacity = Math.max(0, velocities[0].life);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={24} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color={impact.power > 80 ? '#E8FF2A' : '#FFFFFF'} transparent opacity={0.9} sizeAttenuation />
    </points>
  );
}

export function ImpactEffects({ impacts }: ImpactEffectsProps) {
  // Keep only recent impacts (last 800ms)
  const recent = impacts.filter(i => Date.now() - i.timestamp < 800);

  return (
    <group>
      {recent.map(imp => (
        <group key={imp.id}>
          <ImpactRing impact={imp} />
          {imp.power > 40 && <ParticleBurst impact={imp} />}
        </group>
      ))}
    </group>
  );
}
