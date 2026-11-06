import type { Variants } from "framer-motion";

const ease = [0.2, 0, 0, 1] as const;

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.24, ease } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.22, ease } },
};

export const staggerChildren: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

export const cardHover = {
  y: -3,
  transition: { duration: 0.18, ease },
};

export const modalEntrance: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease } },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.14, ease } },
};

export const drawerEntrance: Variants = {
  hidden: { x: "100%" },
  visible: { x: 0, transition: { duration: 0.24, ease } },
  exit: { x: "100%", transition: { duration: 0.18, ease } },
};

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease } },
  exit: { opacity: 0, transition: { duration: 0.12, ease } },
};

export const buttonInteraction = {
  whileTap: { scale: 0.98 },
  transition: { duration: 0.12, ease },
};