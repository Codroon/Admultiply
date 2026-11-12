import type { Metadata } from "next";
import { LegalPage, List, Mail, Section, Term } from "@/components/legal/legal";

export const metadata: Metadata = {
  title: "Privacy Policy · AdMultiply",
  description:
    "What personal data AdMultiply collects, why, who it is shared with, and the rights you have over it.",
};

/* DRAFT FOR LEGAL REVIEW. Every statement of fact below was checked against
   the code on 13 November 2026, and it has to stay true, so when the product
   changes this page changes with it:

   - Section 4 names every outside service that touches personal data. Adding
     one (Cloudflare R2 for storage is planned, so are analytics and error
     monitoring) means adding it here first.
   - Section 7 says there are no analytics or advertising cookies. That is true
     today and is the reason the site needs no cookie banner. The day an
     analytics script is added, UK law (PECR) wants consent before it runs.
   - Section 5 says we do not train our own models on customer video. The FAQ
     on the landing page currently says the opposite. One of the two has to
     change, and that is the client's decision.

   A solicitor should confirm the legal bases in section 3 and the transfer
   wording in section 6. Most UK businesses that handle personal data also
   have to register with the ICO and pay its data protection fee. */

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="13 November 2026">
      <Section title="Who we are">
        <p>
          AdMultiply (<Term>we</Term>, <Term>us</Term>) is a business based in
          the United Kingdom. We run admultiply.io and the AdMultiply service,
          and we are the controller of the personal data described here.
        </p>
        <p>
          For anything about your data, write to{" "}
          <Mail to="privacy@admultiply.io" />.
        </p>
      </Section>

      <Section n={1} title="What we collect">
        <List
          items={[
            <>
              <Term>Account details.</Term> Your email address, and your name
              if you give it. If you sign in with Google, Google shares your
              name, email address and profile picture with us.
            </>,
            <>
              <Term>Your content.</Term> The videos you upload, including any
              people and voices in them, and what we generate from them: micro
              ads, transcripts and analysis.
            </>,
            <>
              <Term>Account activity.</Term> Your plan, your token balance,
              the uploads you have made, and records of when you signed in.
            </>,
            <>
              <Term>Waitlist details.</Term> If you joined the waitlist, your
              email address, your company name if you gave it, and your
              answers to our short survey.
            </>,
            <>
              <Term>Technical data.</Term> Your IP address and basic browser
              and device information, which our hosting providers record in
              their logs.
            </>,
            <>
              <Term>Payment details.</Term> When you buy a paid plan, payment
              is handled by our payment provider, Stripe. We never see or
              store your full card number. We receive confirmation that you
              paid, which plan you chose, and your billing contact details.
            </>,
            <>
              <Term>Messages.</Term> Anything you send us by email.
            </>,
          ]}
        />
      </Section>

      <Section n={2} title="How we use it">
        <List
          items={[
            "To create your account and sign you in.",
            "To turn the videos you upload into micro ads and keep them available for you to download.",
            "To send you emails the service needs, such as sign in codes and notices that your micro ads are ready.",
            "To keep track of your plan and tokens, and to take payment for paid plans.",
            "To keep the service secure and prevent misuse.",
            "To answer you when you contact us.",
            "To tell waitlist members when AdMultiply is open.",
          ]}
        />
      </Section>

      <Section n={3} title="Our legal reasons for using it">
        <p>UK data protection law requires us to have a reason. Ours are:</p>
        <List
          items={[
            <>
              <Term>Contract.</Term> We need your account details and your
              content to provide the service you signed up for.
            </>,
            <>
              <Term>Legitimate interests.</Term> Keeping the service secure,
              preventing misuse, and replying to your messages.
            </>,
            <>
              <Term>Consent.</Term> Emails to the waitlist. You can withdraw
              consent at any time by writing to us, or with the unsubscribe
              link in any of those emails.
            </>,
            <>
              <Term>Legal obligation.</Term> Keeping the financial records the
              law requires.
            </>,
          ]}
        />
      </Section>

      <Section n={4} title="Who we share it with">
        <p>
          We do not sell your personal data, and we do not share your videos
          with other customers. We use the following companies to run the
          service, and each one only receives what it needs to do its job:
        </p>
        <List
          items={[
            <>
              <Term>Supabase.</Term> Stores account details and signs you in.
            </>,
            <>
              <Term>Vercel.</Term> Hosts the website.
            </>,
            <>
              <Term>Railway.</Term> Runs the video processing and stores your
              uploads and micro ads.
            </>,
            <>
              <Term>TwelveLabs.</Term> Analyses what is shown in your video.
            </>,
            <>
              <Term>OpenAI.</Term> Transcribes the audio of your video and
              helps plan the cuts.
            </>,
            <>
              <Term>Resend.</Term> Sends our emails.
            </>,
            <>
              <Term>Google.</Term> Only if you choose to sign in with Google.
            </>,
            <>
              <Term>Stripe.</Term> Takes payment when you buy a paid plan.
            </>,
          ]}
        />
        <p>
          We may also disclose data if the law requires us to, or to protect
          our legal rights.
        </p>
      </Section>

      <Section n={5} title="Your videos and AI">
        <p>
          To produce your micro ads, your video and its audio are sent to the
          AI providers named above, which process them and return the results
          to us. We do not use your videos to train our own AI models.
        </p>
        <p>
          If your video shows other people, you are responsible for having the
          right to use their image and voice. We process that footage only to
          produce your micro ads.
        </p>
      </Section>

      <Section n={6} title="Where your data is processed">
        <p>
          Some of the companies we use are based outside the United Kingdom,
          including in the United States. When personal data leaves the UK, we
          rely on safeguards recognised by UK law, such as adequacy
          regulations or approved contract terms for international transfers.
        </p>
      </Section>

      <Section n={7} title="Cookies and browser storage">
        <p>
          We use a small number of cookies that are strictly necessary: they
          keep you signed in. We also keep your display preferences and the
          state of your workspace in your browser&apos;s own storage.
        </p>
        <p>
          We do not use advertising cookies or analytics cookies. If that
          changes, we will update this policy and ask for your consent where
          the law requires it.
        </p>
      </Section>

      <Section n={8} title="How long we keep it">
        <List
          items={[
            "Account details: for as long as your account is open.",
            "Uploads and micro ads: for as long as your account is open, so you can download them again, or until you ask us to delete them.",
            "Waitlist details: until AdMultiply opens to you or you unsubscribe.",
            "Payment records: for as long as tax and accounting law requires.",
          ]}
        />
        <p>
          When you ask us to delete your account, we delete your account
          details and your content within one month, apart from anything the
          law requires us to keep.
        </p>
      </Section>

      <Section n={9} title="Your rights">
        <p>Under UK data protection law you can ask us to:</p>
        <List
          items={[
            "give you a copy of your personal data",
            "correct anything that is wrong",
            "delete your data",
            "stop or limit how we use it",
            "send your data to you or to another service in a usable format",
          ]}
        />
        <p>
          You can also object to how we use your data, and withdraw any
          consent you have given. To use any of these rights, write to{" "}
          <Mail to="privacy@admultiply.io" />. We will reply within one month.
        </p>
        <p>
          If you are unhappy with how we have handled your data, you can
          complain to the Information Commissioner&apos;s Office at
          ico.org.uk. We would appreciate the chance to put things right
          first.
        </p>
      </Section>

      <Section n={10} title="Security">
        <p>
          Data is encrypted in transit between your browser and our service.
          No online service can promise perfect security, but if a breach puts
          your data at risk we will tell you and the regulator, as the law
          requires.
        </p>
      </Section>

      <Section n={11} title="Children">
        <p>
          AdMultiply is for businesses and is not intended for anyone under
          18. We do not knowingly collect data from children.
        </p>
      </Section>

      <Section n={12} title="Changes to this policy">
        <p>
          We will update this policy when what we do with data changes. The
          date at the top shows the latest version, and if a change is
          significant we will email you.
        </p>
      </Section>

      <Section n={13} title="Contact">
        <p>
          Privacy questions and requests: <Mail to="privacy@admultiply.io" />.
          Everything else: <Mail to="hello@admultiply.io" />.
        </p>
      </Section>
    </LegalPage>
  );
}
