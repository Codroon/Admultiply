import type { Metadata } from "next";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ScaleCta } from "@/components/landing/scale-cta";
import { Testimonials } from "@/components/landing/testimonials";
import { Pricing } from "@/components/landing/pricing";
import { Workflow } from "@/components/landing/workflow";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";

/* Full landing page, parked here pre-launch for internal/client review.
   The public homepage is the waitlist until launch. */
export const metadata: Metadata = {
  title: "AdMultiply — Preview",
  robots: { index: false, follow: false },
};

export default function PreviewPage() {
  return (
    <main>
      <Hero />
      <HowItWorks />
      <ScaleCta />
      <Testimonials />
      <Pricing />
      <Workflow />
      <Faq />
      <FinalCta />
      <Footer />
    </main>
  );
}
