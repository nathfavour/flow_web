import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { AppProviders } from "@/providers";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://flow.kylrix.space'),
  title: "Kylrix Flow — Intelligence Layer Orchestration",
  description: "Secure, premium AI-driven orchestration and workflow management.",
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: "Kylrix Flow",
    description: "Intelligence Layer Orchestration",
    images: ['/og-image.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.png'],
  }
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const userAgent = headers().get('user-agent') || '';
  const isMobileHint = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent);

  return (
    <html lang="en" suppressHydrationWarning className={mono.variable}>
      <head>
        <link 
          href="https://api.fontshare.com/v2/css?f[]=clash-display@200,300,400,500,600,700&f[]=satoshi@300,400,500,700,900&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body>
        <AppProviders isMobileHint={isMobileHint}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
