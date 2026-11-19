import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree, Geist_Mono } from "next/font/google";

import "./globals.css";

// Variable names match the font tokens in globals.css (--font-sans, --font-bricolage,
// --font-geist-mono). Figtree is the body and button font; Bricolage Grotesque is for headings.
const figtree = Figtree({
  variable: "--font-sans",
  subsets: ["latin"],
  // 700: buttons and other bold labels.
  weight: ["400", "500", "600", "700"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  // 800: the logo wordmark.
  weight: ["600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BookMate AI",
  description: "AI booking agents for small businesses on WhatsApp.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-scroll-behavior: smooth scrolling for in-page links (#pricing), but not when
    // Next.js scrolls to the top on navigation.
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${figtree.variable} ${bricolage.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
