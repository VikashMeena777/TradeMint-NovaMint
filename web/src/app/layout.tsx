import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "TradeMind AI — AI-Powered Trade Signals for Indian Markets",
    template: "%s | TradeMind AI",
  },
  description:
    "Get institutional-grade AI trade signals for NSE & BSE stocks. 8 AI agents analyze fundamentals, technicals, sentiment & news to generate buy/sell recommendations with entry, stop-loss & target prices.",
  keywords: [
    "AI trading",
    "stock signals",
    "NSE",
    "BSE",
    "Indian stock market",
    "trade signals",
    "artificial intelligence",
    "Nifty 50",
    "technical analysis",
    "fundamental analysis",
  ],
  authors: [{ name: "TradeMind AI" }],
  openGraph: {
    title: "TradeMind AI — AI-Powered Trade Signals",
    description: "Institutional-grade AI trade signals for Indian markets",
    type: "website",
    locale: "en_IN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
              color: "#f5f5f5",
            },
          }}
        />
      </body>
    </html>
  );
}
