import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, List, Mail, Section, Term } from "@/components/legal/legal";

export const metadata: Metadata = {
  title: "Terms of Service · AdMultiply",
  description:
    "The terms that apply when you use AdMultiply to turn a video ad into short variations.",
};

/* DRAFT FOR LEGAL REVIEW. Written to describe the product as it actually
   behaves, in plain English, but not checked by a solicitor. Before launch a
   lawyer should confirm, at minimum: the liability cap in section 12, the
   governing law in section 14 (England and Wales is an assumption, the
   business is only known to be UK based), and that the trading name here
   matches the registered entity. If AdMultiply is a limited company, UK law
   also wants its registered name, number and office address shown on the
   site.

   Two positions in here are the client's to confirm, because they are policy
   rather than fact: unused tokens do not roll over (section 3, which matches
   the FAQ already on the landing page), and refunds (section 4, which
   deliberately promises nothing beyond what is shown at checkout). */

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="13 November 2026">
      <Section title="The short version">
        <p>
          These terms are the agreement between you and AdMultiply (
          <Term>we</Term>, <Term>us</Term>) for using admultiply.io and the
          AdMultiply service. By creating an account or using the service you
          agree to them. If you use AdMultiply for a business, you confirm you
          are allowed to agree on its behalf.
        </p>
        <p>
          AdMultiply is a business based in the United Kingdom. You can reach
          us at <Mail to="hello@admultiply.io" />.
        </p>
      </Section>

      <Section n={1} title="What AdMultiply does">
        <p>
          You upload a video ad. AdMultiply uses AI to analyse it and produce
          short vertical variations of it, which we call micro ads. The micro
          ads are generated automatically, so you are responsible for checking
          them before you publish them anywhere.
        </p>
      </Section>

      <Section n={2} title="Your account">
        <List
          items={[
            "You must be at least 18 and able to enter into a contract.",
            "The details you give us must be accurate.",
            "Sign in codes are sent to your email address, so keep that inbox secure. You are responsible for what happens under your account.",
            <>
              If you think someone else has access to your account, tell us at{" "}
              <Mail to="hello@admultiply.io" />.
            </>,
          ]}
        />
      </Section>

      <Section n={3} title="Plans and tokens">
        <p>
          Each upload uses one token and produces up to three micro ads. Your
          plan sets how many tokens you receive each month and what you can
          download, including whether downloads carry an AdMultiply watermark.
          Tokens are added at the start of each monthly period and unused
          tokens do not carry over to the next one.
        </p>
        <p>
          If a job fails because of a problem on our side, the token is
          returned to you. We may change what a plan includes. If a change
          affects a plan you are paying for, we will tell you before it takes
          effect.
        </p>
      </Section>

      <Section n={4} title="Paid plans">
        <p>
          Paid plans are billed in advance for each billing period through our
          payment provider. The price, the billing period and any refund terms
          are shown to you before you pay. You can cancel at any time, and
          your plan stays active until the end of the period you have paid
          for.
        </p>
        <p>Nothing in these terms affects your legal rights.</p>
      </Section>

      <Section n={5} title="Your content">
        <p>
          You keep all rights in the videos you upload and in the micro ads
          made from them.
        </p>
        <p>
          You give us permission to store, process, edit and reproduce your
          content only as far as needed to run the service for you. That
          includes sending it to the AI providers that analyse and transcribe
          it, who are named in our{" "}
          <Link
            href="/privacy"
            className="font-medium text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
          >
            Privacy Policy
          </Link>
          .
        </p>
        <p>
          We do not sell your content, we do not show it to other customers,
          and we do not use it in our own marketing without your permission.
        </p>
      </Section>

      <Section n={6} title="What you must not do">
        <List
          items={[
            "Upload anything you do not own or have permission to use. That includes the footage, the music, and the image and voice of anyone who appears in it.",
            "Upload anything unlawful, infringing, deceptive or harmful.",
            "Try to break, overload or copy the service, or get around its limits, including plan limits and watermarks.",
            "Resell access to the service or share one account between several businesses.",
          ]}
        />
        <p>
          We may remove content or suspend an account that breaks these rules.
        </p>
      </Section>

      <Section n={7} title="AI generated output">
        <p>
          Micro ads, captions and analysis are produced by AI and can contain
          mistakes. We do not promise that any micro ad will perform in a
          particular way, be approved by an advertising platform, or be free
          of errors. Before you publish, check that the result is accurate and
          that it follows the rules of the platform you are using and the law
          on advertising where you operate.
        </p>
      </Section>

      <Section n={8} title="Keeping your videos">
        <p>
          We store your uploads and micro ads so you can download them again,
          but AdMultiply is not a backup service. Keep your own copy of
          anything that matters to you.
        </p>
      </Section>

      <Section n={9} title="Availability and changes">
        <p>
          We work to keep AdMultiply running, but we do not guarantee that it
          will always be available or free of faults. We may change, add or
          remove features as the product develops.
        </p>
      </Section>

      <Section n={10} title="Ending your account">
        <p>
          You can stop using AdMultiply at any time, and you can ask us to
          delete your account by emailing <Mail to="privacy@admultiply.io" />.
          We may suspend or close an account that breaks these terms. When an
          account is closed, we delete its content as described in our Privacy
          Policy.
        </p>
      </Section>

      <Section n={11} title="Our rights in the service">
        <p>
          The AdMultiply name, website and software belong to us. These terms
          give you the right to use the service, not to copy it or build a
          competing product from it.
        </p>
      </Section>

      <Section n={12} title="Our responsibility to you">
        <p>
          Nothing in these terms limits our liability for death or personal
          injury caused by our negligence, for fraud, or for anything else
          that the law does not allow us to limit.
        </p>
        <p>
          Apart from that, we are not responsible for loss of profit, loss of
          business, wasted advertising spend, or any indirect loss arising
          from your use of the service. Our total liability to you is limited
          to the amount you paid us in the 12 months before the claim, or
          £100 if that is greater.
        </p>
        <p>
          If you are using AdMultiply as a consumer, you have legal rights
          that these terms do not remove.
        </p>
      </Section>

      <Section n={13} title="Changes to these terms">
        <p>
          We may update these terms. The date at the top shows when they last
          changed, and if a change is significant we will email you before it
          takes effect. Continuing to use the service after a change means you
          accept the new terms.
        </p>
      </Section>

      <Section n={14} title="The law that applies">
        <p>
          These terms are governed by the law of England and Wales, and its
          courts will deal with any dispute. If you are a consumer living in
          Scotland or Northern Ireland, you can also bring a claim in your
          local courts.
        </p>
      </Section>

      <Section n={15} title="Contact">
        <p>
          Questions about these terms: <Mail to="hello@admultiply.io" />.
        </p>
      </Section>
    </LegalPage>
  );
}
