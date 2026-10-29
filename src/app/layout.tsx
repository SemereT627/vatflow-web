import type { Metadata } from "next";
import { Inter, Geist_Mono, Noto_Sans_Ethiopic } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/query-provider";

// Same type system as Kiln. Generic variable names (--font-body / --font-code)
// so swapping a family only touches this file, never globals.css.
const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-code",
  subsets: ["latin"],
});

// Inter has no Ethiopic glyphs — give Amharic text a matching fallback.
const notoEthiopic = Noto_Sans_Ethiopic({
  variable: "--font-ethiopic",
  subsets: ["ethiopic"],
});

export const metadata: Metadata = {
  title: "VatFlow",
  description: "Point-of-sale VAT recording and Ministry of Revenue reporting.",
  icons: {
    icon: "/brand/icon.png",
    apple: "/brand/icon.png",
  },
  openGraph: {
    title: "VatFlow",
    description: "Point-of-sale VAT recording and Ministry of Revenue reporting.",
    images: ["/brand/og-banner.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "VatFlow",
    description: "Point-of-sale VAT recording and Ministry of Revenue reporting.",
    images: ["/brand/og-banner.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} ${notoEthiopic.variable} h-full antialiased`}
    >
      <body className="h-full font-sans text-foreground">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
