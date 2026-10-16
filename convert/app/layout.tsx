import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Inter } from "next/font/google";

import "./globals.css";

/* The three families the site has always used. Loaded through next/font
   rather than a <link> to Google Fonts so they are self-hosted at build
   time: no third-party request on page load, and no flash of fallback
   text. The CSS variables are what the stylesheets reference. */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// IBM Plex Mono is not a variable font, so the weights have to be named.
// Only 500 and 600 are used (labels and the small caps strips).
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "School Wits · Cambridge Question Bank",
  description:
    "Cambridge O Level and IGCSE past papers, mark schemes and worked solutions, searchable by subject and topic.",
  icons: { icon: "/img/logo.jpg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
