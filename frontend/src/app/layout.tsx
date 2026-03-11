import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoFi – Autopilot Finance on Flow",
  description:
    "Automate investing, subscriptions, savings, and trading strategies on the Flow blockchain. No manual steps. Just intelligent, rule-based financial automation.",
  keywords: ["DeFi", "Flow blockchain", "automated investing", "DCA", "crypto automation"],
  openGraph: {
    title: "AutoFi – Autopilot Finance on Flow",
    description: "Automate your crypto financial life on Flow blockchain",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
