import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Float, Lightformer } from "@react-three/drei";
import { Suspense, useRef } from "react";
import * as THREE from "three";
import { FinancialOrb } from "./FinancialOrb";
import { FloatingGeometry } from "./FloatingGeometry";

function Scene() {
  const group = useRef<THREE.Group>(null);
  const { pointer } = useThree();

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.08;
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, pointer.y * 0.12, 2, delta);
    group.current.rotation.z = THREE.MathUtils.damp(group.current.rotation.z, -pointer.x * 0.1, 2, delta);
  });

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[4, 5, 4]} intensity={1.5} color="#FFF3E8" />
      <pointLight position={[-4, -2, 3]} intensity={1} color="#D97745" />
      <Environment resolution={128}>
        <Lightformer intensity={1.5} position={[0, 5, -6]} scale={[8, 8, 1]} />
        <Lightformer intensity={1.1} position={[5, 1, 4]} scale={[6, 4, 1]} color="#FFD0AE" />
        <Lightformer intensity={0.8} position={[-5, -2, 2]} scale={[5, 4, 1]} color="#FFF8EF" />
      </Environment>
      <group ref={group}>
        <Float speed={1} rotationIntensity={0.08} floatIntensity={0.25}>
          <FinancialOrb />
          <FloatingGeometry />
        </Float>
      </group>
    </>
  );
}

export default function Hero3DCanvas() {
  return (
    <div className="aspect-square w-full max-w-[38rem]" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 5.2], fov: 42 }}
        dpr={[1, 1.35]}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      >
        <Suspense fallback={null}><Scene /></Suspense>
      </Canvas>
    </div>
  );
}
