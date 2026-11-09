import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import type { PointerEvent } from "react";
import { ArrowDownIcon, ArrowRightIcon, CheckIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Hero3D } from "@/components/three/Hero3D";

export function HeroSection() {
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 180, damping: 28, mass: 0.5 });
  const springY = useSpring(pointerY, { stiffness: 180, damping: 28, mass: 0.5 });
  const backgroundX = useTransform(springX, [-1, 1], [-16, 16]);
  const backgroundY = useTransform(springY, [-1, 1], [-16, 16]);
  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (reduceMotion || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 2);
    pointerY.set(((event.clientY - bounds.top) / bounds.height - 0.5) * 2);
  };
  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
  };
  const reveal = (delay: number) => ({
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0.1 : 0.5, delay: reduceMotion ? 0 : delay },
  });

  return (
    <section id="home" onPointerMove={handlePointerMove} onPointerLeave={resetPointer} className="relative isolate overflow-hidden pb-12 pt-28 sm:pb-20 sm:pt-36 lg:min-h-[46rem] lg:pb-24 lg:pt-40">
      <motion.div aria-hidden="true" style={reduceMotion ? undefined : { x: backgroundX, y: backgroundY }} className="pointer-events-none absolute -right-40 top-20 -z-10 size-[34rem] rounded-full bg-[#f7e8d9]/70 blur-3xl" />
      <motion.div aria-hidden="true" style={reduceMotion ? undefined : { x: backgroundY, y: backgroundX }} className="pointer-events-none absolute -left-48 bottom-0 -z-10 size-[28rem] rounded-full bg-white/80 blur-3xl" />
      <div className="mx-auto grid max-w-[var(--content-max)] items-center gap-8 px-[var(--space-page)] lg:grid-cols-[1.05fr_0.95fr] lg:gap-4">
        <div className="relative z-10 max-w-2xl">
          <motion.div {...reveal(0)}>
            <Badge variant="accent" className="gap-2 px-3 py-1.5">
              <SparklesIcon className="size-4" aria-hidden="true" />
              A clearer view of your finances
            </Badge>
          </motion.div>
          <motion.h1
            {...reveal(0.08)}
            className="mt-6 max-w-3xl font-display text-[clamp(2.7rem,7vw,5.25rem)] font-semibold leading-[1.02] tracking-[-0.055em]"
          >
            Understand your money.
            <span className="relative mt-1 block text-accent-primary">
              Move forward with clarity.
              <span aria-hidden="true" className="absolute -bottom-2 left-0 h-1 w-2/3 rounded-full bg-accent-primary/25" />
            </span>
          </motion.h1>
          <motion.p {...reveal(0.16)} className="mt-7 max-w-xl text-base leading-7 text-ink-muted sm:text-lg sm:leading-8">
            Bring the pieces of your financial life into focus. FinSight AI is designed to turn everyday money activity into a more thoughtful picture of what comes next.
          </motion.p>
          <motion.div {...reveal(0.24)} className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
            <ButtonLink to="/register" size="lg" className="w-full min-[420px]:w-auto">
              Get started <ArrowRightIcon className="size-4" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink to="/demo" variant="outline" size="lg" className="w-full min-[420px]:w-auto">
              Explore the demo
            </ButtonLink>
          </motion.div>
          <motion.div {...reveal(0.32)} className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-ink-muted">
            {["No financial account connection in this preview", "Illustrative data only"].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <CheckIcon className="size-4 text-success" aria-hidden="true" />{item}
              </span>
            ))}
          </motion.div>
        </div>

        <div className="relative mx-auto w-full max-w-[36rem] lg:-mr-4">
          <div className="absolute inset-8 rounded-full bg-[#f1c5a6]/30 blur-3xl" aria-hidden="true" />
          <Hero3D />
          <div className="absolute left-0 top-[22%] hidden rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-md backdrop-blur-md sm:block">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">One clear picture</p>
            <p className="mt-1 font-display text-sm font-bold">Across your money</p>
          </div>
          <div className="absolute bottom-[18%] right-0 hidden rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-md backdrop-blur-md sm:block">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Designed for better decisions</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-secondary">
              Thoughtful insights <SparklesIcon className="size-4" />
            </p>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => document.querySelector("#stats")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" })}
        className="mx-auto mt-8 hidden items-center gap-2 text-xs font-medium text-ink-muted hover:text-ink lg:flex"
      >
        Discover FinSight <ArrowDownIcon className="size-4" aria-hidden="true" />
      </button>
    </section>
  );
}
