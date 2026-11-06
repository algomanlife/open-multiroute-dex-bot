import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/providers/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Open Multiroute DEX Bot",
  description:
    "A comprehensive open-source trading bot that routes TradingView alerts to multiple DEXes",
  icons: { icon: "/logo.svg" }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
