import { LandingNavbar } from "@/components/navigation/LandingNavbar";
import { AssistantShowcase } from "./sections/AssistantShowcase";
import { CTASection } from "./sections/CTASection";
import { FAQSection } from "./sections/FAQSection";
import { FeaturesSection } from "./sections/FeaturesSection";
import { HeroSection } from "./sections/HeroSection";
import { HowItWorksSection } from "./sections/HowItWorksSection";
import { LandingFooter } from "./sections/LandingFooter";
import { ProblemSolutionSection } from "./sections/ProblemSolutionSection";
import { ProductPreviewSection } from "./sections/ProductPreviewSection";
import { SecuritySection } from "./sections/SecuritySection";
import { StatsSection } from "./sections/StatsSection";

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <LandingNavbar />
      <main>
        <HeroSection />
        <StatsSection />
        <ProblemSolutionSection />
        <FeaturesSection />
        <HowItWorksSection />
        <ProductPreviewSection />
        <AssistantShowcase />
        <SecuritySection />
        <FAQSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
