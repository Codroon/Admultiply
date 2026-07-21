import type { Metadata } from "next";
import { WaitlistFlow } from "@/components/waitlist/waitlist-flow";

/* Pre-launch: the waitlist IS the homepage. The full landing page is parked
   at /preview (noindex) until launch, when this swap reverses. */
export const metadata: Metadata = {
  title: "AdMultiply — Join the Waitlist",
  description:
    "Creative fatigue killing your ROAS? Join the AdMultiply waitlist for early access, free trial tokens, and exclusive launch pricing. Launching September 2026.",
};

export default function HomePage() {
  return <WaitlistFlow />;
}
