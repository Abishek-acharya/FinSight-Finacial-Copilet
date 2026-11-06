import type { ReactNode } from "react";
import { ArrowUpRightIcon } from "@heroicons/react/20/solid";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface FeatureCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function FeatureCard({ title, description, icon, href, onClick, className }: FeatureCardProps) {
  const reduceMotion = useReducedMotion();
  const content = (
    <CardContent className="h-full">
      {icon && <span aria-hidden="true" className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-[#f8e9df] text-accent-secondary">{icon}</span>}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold">{title}</h3>
        {(href || onClick) && <ArrowUpRightIcon aria-hidden="true" className="size-5 shrink-0 text-ink-muted" />}
      </div>
      <p className="mt-2 text-sm text-ink-muted">{description}</p>
    </CardContent>
  );
  const interactive = Boolean(href || onClick);
  const cardClass = cn("h-full", interactive && "cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary", className);

  if (href) {
    return <a href={href} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"><Card interactive className={cardClass}>{content}</Card></a>;
  }
  if (onClick) {
    return (
      <motion.div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
          }
        }}
        whileHover={!reduceMotion ? { y: -3 } : undefined}
        className={cn("rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary", cardClass)}
      >
        <Card interactive>{content}</Card>
      </motion.div>
    );
  }
  return <Card className={cardClass}>{content}</Card>;
}