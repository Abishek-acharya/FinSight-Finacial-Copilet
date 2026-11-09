import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

export interface AnimatedNumberProps {
  value: number;
  format?: (value: number) => string;
  duration?: number;
  className?: string;
}

export function AnimatedNumber({
  value,
  format = (number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(number),
  duration = 700,
  className,
}: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const currentValue = useRef(0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (reduceMotion || duration <= 0) {
      currentValue.current = value;
      setDisplayValue(value);
      return;
    }

    let frame = 0;
    let startTime = 0;
    const from = currentValue.current;
    const tick = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      const next = from + (value - from) * eased;
      currentValue.current = next;
      setDisplayValue(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduceMotion]);

  return <span className={className}>{format(displayValue)}</span>;
}
