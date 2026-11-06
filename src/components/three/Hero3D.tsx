import { lazy, Suspense, useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Hero3DFallback } from "./Hero3DFallback";

const Hero3DCanvas = lazy(() => import("./Hero3DCanvas"));

export function Hero3D() {
  const reduceMotion = useReducedMotion();
  const [webglAvailable, setWebglAvailable] = useState(false);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      setWebglAvailable(Boolean(
        window.WebGLRenderingContext
        && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")),
      ));
    } catch {
      setWebglAvailable(false);
    }
  }, []);

  if (reduceMotion || !webglAvailable) return <Hero3DFallback />;
  return (
    <Suspense fallback={<Hero3DFallback />}>
      <Hero3DCanvas />
    </Suspense>
  );
}
