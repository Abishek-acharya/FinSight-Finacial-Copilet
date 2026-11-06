import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const links = [
  { label: "Product", href: "#product" },
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Security", href: "#security" },
];

export function LandingNavbar() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const updateScroll = () => setScrolled(window.scrollY > 16);
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    return () => window.removeEventListener("scroll", updateScroll);
  }, []);

  useEffect(() => {
    const targets = links
      .map(({ href }) => document.querySelector<HTMLElement>(href))
      .filter((target): target is HTMLElement => target !== null);
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(`#${visible.target.id}`);
      },
      { rootMargin: "-25% 0px -60% 0px", threshold: [0, 0.2, 0.5] },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);
  const scrollToSection = (href: string) => {
    closeMenu();
    document.querySelector(href)?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[var(--z-sticky)] border-b transition-[background-color,box-shadow,border-color] duration-300",
        scrolled || menuOpen
          ? "border-border bg-background/95 shadow-sm backdrop-blur-xl"
          : "border-transparent bg-background/70 backdrop-blur-sm",
      )}
    >
      <nav aria-label="Main navigation" className="mx-auto flex h-[4.5rem] max-w-[var(--content-max)] items-center justify-between gap-5 px-[var(--space-page)]">
        <Link to="/" className="flex shrink-0 items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary" onClick={closeMenu}>
          <span className="grid size-9 place-items-center rounded-xl bg-accent-primary text-sm font-bold text-ink">F</span>
          <span className="font-display text-lg font-extrabold tracking-tight text-ink">FinSight<span className="text-accent-secondary"> AI</span></span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => scrollToSection(link.href)}
              aria-current={activeSection === link.href ? "location" : undefined}
              className={cn(
                "min-h-10 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-surface-secondary",
                activeSection === link.href ? "text-ink" : "text-ink-muted",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
              )}
            >
              {link.label}
            </button>
          ))}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <ButtonLink to="/app/overview" size="sm">Dashboard</ButtonLink>
          ) : (
            <>
              <ButtonLink to="/login" variant="ghost" size="sm">Log in</ButtonLink>
              <ButtonLink to="/register" size="sm">Get started <span aria-hidden="true">↗</span></ButtonLink>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          {user ? (
            <ButtonLink to="/app/overview" size="sm" className="hidden min-[380px]:inline-flex">Dashboard</ButtonLink>
          ) : (
            <ButtonLink to="/login" variant="ghost" size="sm" className="hidden min-[380px]:inline-flex">Log in</ButtonLink>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <XMarkIcon className="size-5" /> : <Bars3Icon className="size-5" />}
          </Button>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="landing-mobile-menu"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.18 }}
            className="absolute inset-x-0 top-full border-b border-border bg-background/98 px-[var(--space-page)] pb-5 pt-2 shadow-lg backdrop-blur-xl lg:hidden"
          >
            <div className="mx-auto flex max-w-[var(--content-max)] flex-col gap-1">
              {links.map((link) => (
                <button
                  type="button"
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className={cn(
                    "min-h-11 rounded-lg px-3 text-left text-sm font-medium hover:bg-surface-secondary",
                    activeSection === link.href ? "text-ink" : "text-ink-muted",
                  )}
                >
                  {link.label}
                </button>
              ))}
              {user ? (
                <ButtonLink to="/app/overview" className="mt-2" onClick={closeMenu}>Dashboard</ButtonLink>
              ) : (
                <ButtonLink to="/register" className="mt-2" onClick={closeMenu}>Get started</ButtonLink>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
