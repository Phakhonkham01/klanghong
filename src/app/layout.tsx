import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Lao } from "next/font/google";
import { Providers } from "@/components/providers";
import { lo } from "@/lib/i18n/lo";
import "./globals.css";

const notoLao = Noto_Sans_Lao({
  variable: "--font-lao",
  subsets: ["lao", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
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
    <html lang="lo" suppressHydrationWarning>
      <body className={`${notoLao.variable} ${inter.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
