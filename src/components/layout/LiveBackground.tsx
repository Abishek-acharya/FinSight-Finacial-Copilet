import { useEffect, useRef } from "react";

export function LiveBackground() {
  const cursorGlowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glow = cursorGlowRef.current;
    if (!glow || !window.matchMedia("(pointer: fine)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        glow.style.setProperty("--cursor-x", `${pointerX}px`);
        glow.style.setProperty("--cursor-y", `${pointerY}px`);
        glow.style.opacity = "1";
        frame = 0;
      });
    };
    const handlePointerLeave = (event: PointerEvent) => {
      if (event.relatedTarget === null) glow.style.opacity = "0";
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerout", handlePointerLeave);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerout", handlePointerLeave);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background"
    >
      <div className="bg-grid-pattern absolute inset-0 opacity-60" />
      <div className="animate-aurora-1 absolute -right-[10%] -top-[10%] h-[60vh] w-[60vw] rounded-full bg-accent-primary/20 blur-[120px] mix-blend-multiply" />
      <div className="animate-aurora-2 absolute -bottom-[20%] -left-[10%] h-[70vh] w-[60vw] rounded-full bg-accent-green/10 blur-[130px] mix-blend-multiply" />
      <div className="animate-aurora-3 absolute left-[30%] top-[30%] h-[40vh] w-[40vw] rounded-full bg-accent-gold/10 blur-[100px] mix-blend-multiply" />
      <div
        ref={cursorGlowRef}
        className="absolute left-0 top-0 h-[500px] w-[500px] rounded-full bg-accent-primary/10 opacity-0 blur-[100px] mix-blend-multiply transition-opacity duration-500"
        style={{
          transform: "translate3d(var(--cursor-x, -1000px), var(--cursor-y, -1000px), 0) translate(-50%, -50%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%270 0 180 180%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.8%27 numOctaves=%272%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27 opacity=%270.7%27/%3E%3C/svg%3E")',
        }}
      />
    </div>
  );
}
