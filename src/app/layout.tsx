import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { ThemeScript } from "@/components/theme";
import { UiDensityScript } from "@/components/ui-density-script";
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
    default: "FeldOps",
    template: "%s — FeldOps",
  },
  description:
    "Field service management for Treppenhausreinigung, Gartenpflege, Winterdienst und Glasreinigung",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FeldOps",
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      translate="no"
      className={`${geistSans.variable} ${geistMono.variable} h-full notranslate`}
      suppressHydrationWarning
    >
      <head>
        {/* Prevent browser translation extensions (Edge, Chrome, Google Translate)
            from modifying the DOM before React hydration */}
        <meta name="google" content="notranslate" />
        <ThemeScript />
        <UiDensityScript />
      </head>
      <body className="min-h-full antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
