import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";

export function FinancialOrb() {
  const core = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (core.current) {
      const scale = 0.53 + Math.sin(state.clock.elapsedTime * 1.25) * 0.012;
      core.current.scale.setScalar(scale);
    }
  });

  return (
    <group>
      <mesh>
        <sphereGeometry args={[1.05, 48, 48]} />
        <MeshTransmissionMaterial
          backside
          samples={4}
          resolution={256}
          thickness={0.35}
          chromaticAberration={0.08}
          distortion={0.04}
          distortionScale={0.15}
          color="#FFF8F0"
          attenuationColor="#D97745"
          attenuationDistance={1.7}
        />
      </mesh>
      <mesh ref={core} scale={0.53}>
        <icosahedronGeometry args={[1, 3]} />
        <meshStandardMaterial
          color="#D97745"
          emissive="#B95F3D"
          emissiveIntensity={0.65}
          roughness={0.28}
          metalness={0.12}
        />
      </mesh>
      <mesh scale={0.84}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshBasicMaterial color="#B95F3D" wireframe transparent opacity={0.18} />
      </mesh>
    </group>
  );
}
