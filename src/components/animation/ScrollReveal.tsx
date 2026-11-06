import { motion, useReducedMotion, useInView, type HTMLMotionProps } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { fadeUp } from "./motionVariants";

export interface ScrollRevealProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  delay?: number;
}

export function ScrollReveal({ children, delay = 0, ...props }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -64px 0px" });
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      transition={{ delay }}
      style={reduceMotion ? { y: 0 } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}
