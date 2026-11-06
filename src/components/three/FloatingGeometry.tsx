import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PARTICLE_COUNT = 32;

export function FloatingGeometry() {
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(
    () => Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
      radius: 1.55 + ((index * 17) % 100) / 100 * 0.7,
      speed: 0.12 + ((index * 13) % 100) / 100 * 0.12,
      phase: (index / PARTICLE_COUNT) * Math.PI * 2,
      tilt: ((index * 23) % 100) / 100 * 1.2 - 0.6,
    })),
    [],
  );

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (ringA.current) ringA.current.rotation.z = time * 0.12;
    if (ringB.current) ringB.current.rotation.x = time * 0.1;
    if (!particlesRef.current) return;

    particles.forEach((particle, index) => {
      const angle = particle.phase + time * particle.speed;
      dummy.position.set(
        Math.cos(angle) * particle.radius,
        particle.tilt + Math.sin(angle * 1.7) * 0.15,
        Math.sin(angle) * particle.radius,
      );
      dummy.scale.setScalar(index % 4 === 0 ? 0.045 : 0.026);
      dummy.updateMatrix();
      particlesRef.current?.setMatrixAt(index, dummy.matrix);
    });
    particlesRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <mesh ref={ringA} rotation={[0.8, 0.2, 0.3]}>
        <torusGeometry args={[1.62, 0.012, 8, 128]} />
        <meshStandardMaterial color="#D97745" metalness={0.65} roughness={0.28} />
      </mesh>
      <mesh ref={ringB} rotation={[1.15, 0.5, 0.7]}>
        <torusGeometry args={[1.92, 0.008, 8, 128]} />
        <meshStandardMaterial color="#F1C3A4" metalness={0.55} roughness={0.3} />
      </mesh>
      <instancedMesh ref={particlesRef} args={[undefined, undefined, PARTICLE_COUNT]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial color="#B95F3D" emissive="#D97745" emissiveIntensity={0.25} />
      </instancedMesh>
      <mesh position={[1.35, 0.65, 0.2]} rotation={[0.3, 0.55, 0.15]}>
        <boxGeometry args={[0.36, 0.24, 0.025]} />
        <meshPhysicalMaterial color="#FFF9F2" roughness={0.2} metalness={0.08} transparent opacity={0.82} />
      </mesh>
      <mesh position={[-1.28, -0.75, -0.2]} rotation={[0.4, -0.5, -0.25]}>
        <boxGeometry args={[0.28, 0.4, 0.025]} />
        <meshPhysicalMaterial color="#E7B18F" roughness={0.25} metalness={0.12} transparent opacity={0.75} />
      </mesh>
    </group>
  );
}
