import { ScrollReveal } from "@/components/animation/ScrollReveal";
import { Accordion, type AccordionItemData } from "@/components/ui/Accordion";

const questions: AccordionItemData[] = [
  { question: "What is FinSight AI?", answer: "FinSight AI is a concept for a more understandable personal finance experience. This phase delivers a public-facing product preview and reusable interface—not a live financial service." },
  { question: "Is the information shown here real?", answer: "No. Balances, transactions, charts, and assistant responses in this preview are illustrative examples and do not represent real users or accounts." },
  { question: "Can I connect my bank account?", answer: "No. Bank connections and financial data imports are not available in this preview." },
  { question: "Does the assistant use live AI?", answer: "No. The assistant showcase uses fixed sample responses to demonstrate a possible interaction. It does not send prompts to an AI model." },
  { question: "Is this financial advice?", answer: "No. FinSight AI is not a financial adviser, and the sample content is not financial, tax, or investment advice." },
  { question: "How do I create an account?", answer: "You can explore the registration form, but account creation and authentication are not connected in this phase. Submitting the form will not create or transmit an account." },
  { question: "What does the guided demo include?", answer: "The demo lets you explore the sample product overview and the scripted assistant experience using fictional data." },
  { question: "When will the full product be available?", answer: "Availability and release timing have not been announced. This preview is the current product experience." },
];

export function FAQSection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto grid max-w-[var(--content-max)] gap-10 px-[var(--space-page)] lg:grid-cols-[0.65fr_1.35fr] lg:gap-20">
        <ScrollReveal>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-secondary">Good to know</p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Questions, answered clearly.</h2>
          <p className="mt-4 leading-7 text-ink-muted">A little more about the preview, what it can do, and what it doesn’t claim to do.</p>
        </ScrollReveal>
        <ScrollReveal delay={0.08}><Accordion items={questions} /></ScrollReveal>
      </div>
    </section>
  );
}
