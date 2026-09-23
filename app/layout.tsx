import type { Metadata } from "next";

import { Grain } from "@/components/motion/Grain";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { PerfTierProvider } from "@/lib/motion/use-motion-policy";
import { body, display, mono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Aqualite", template: "%s — Aqualite" },
  description: "Light on land. At home in water. Footwear for the monsoon and the day after.",
  openGraph: { locale: "en_IN", siteName: "Aqualite", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-body">
        <PerfTierProvider>
          <SmoothScroll>
            <Grain />
            {children}
          </SmoothScroll>
        </PerfTierProvider>
      </body>
    </html>
  );
}
