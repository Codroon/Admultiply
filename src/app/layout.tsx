import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

/* Two faces, two jobs.

   Inter stays for body and UI — it is the right tool for small text and the
   reason it is everywhere. But Inter Bold at 54px was also the headline, and
   that is the default look of every SaaS site since 2019, which is exactly
   what the landing page felt like.

   Bricolage Grotesque is the display face: variable, drawn for large sizes,
   and with enough character that a headline reads as a deliberate choice
   rather than a system default. It is confined to display type — one constant
   here, so swapping it is a single line. */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "AdMultiply — Multiply What Already Works",
  description:
    "Upload 1 winning ad and instantly generate 3 high-performing variations. Fight ad fatigue and scale what works.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${display.variable}`}
    >
      <body className="min-h-screen antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
