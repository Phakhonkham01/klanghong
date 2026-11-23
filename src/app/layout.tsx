import type { Metadata, Viewport } from "next";
import { Noto_Sans_Lao_Looped } from "next/font/google";
import { Providers } from "@/components/providers";
import { lo } from "@/lib/i18n/lo";
import "./globals.css";

/**
 * Noto Sans Lao Looped (variable 100–900) for all text, Lao and Latin.
 * Served from our own domain by next/font: no request to Google at runtime and allowed by the CSP.
 */
const notoLaoLooped = Noto_Sans_Lao_Looped({
  variable: "--font-lao",
  subsets: ["lao", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: lo.app.name, template: `%s · ${lo.app.name}` },
  description: lo.app.tagline,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="lo" className={notoLaoLooped.variable} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
