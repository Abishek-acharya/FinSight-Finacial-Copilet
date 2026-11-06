import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

export interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
  duration = 1000,
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduceMotion = useReducedMotion();
  const [count, setCount] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion || duration <= 0) {
      setCount(value);
      return;
    }

    let frame = 0;
    let startTime = 0;
    const tick = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      setCount(value * (1 - (1 - progress) ** 3));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, inView, reduceMotion, value]);

  return (
    <span ref={ref} className={className} aria-label={`${prefix}${value.toFixed(decimals)}${suffix}`}>
      {prefix}{count.toFixed(decimals)}{suffix}
    </span>
  );
}
