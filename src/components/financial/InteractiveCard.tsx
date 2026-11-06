import type { KeyboardEvent, ReactNode } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface InteractiveCardProps extends Omit<HTMLMotionProps<"div">, "onClick"> {
  children: ReactNode;
  onClick: () => void;
}

export function InteractiveCard({ children, onClick, className, ...props }: InteractiveCardProps) {
  const reduceMotion = useReducedMotion();
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      whileHover={!reduceMotion ? { y: -3 } : undefined}
      className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
      {...props}
    >
      <Card interactive className={cn("h-full", className)}>{children}</Card>
    </motion.div>
  );
}