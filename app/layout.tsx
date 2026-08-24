import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://kiyan-crm.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "KIYAN CRM — نظام إدارة علاقات العملاء B2B بالذكاء الاصطناعي",
    template: "%s | KIYAN CRM",
  },
  description:
    "منصة CRM لفرق المبيعات B2B: تأهيل وإثراء تلقائي للعملاء بالذكاء الاصطناعي، تسلسلات متابعة، إدارة صفقات، وفوترة اشتراكات.",
  openGraph: {
    title: "KIYAN CRM — نظام إدارة علاقات العملاء B2B بالذكاء الاصطناعي",
    description:
      "منصة CRM لفرق المبيعات B2B: تأهيل وإثراء تلقائي للعملاء بالذكاء الاصطناعي، تسلسلات متابعة، إدارة صفقات، وفوترة اشتراكات.",
    url: appUrl,
    siteName: "KIYAN CRM",
    locale: "ar",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}