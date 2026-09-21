import type { Metadata } from "next";
import { Sora, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { QueryProvider } from "@/components/query-provider";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
      className={`${sora.variable} ${manrope.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex h-full flex-col font-sans text-foreground md:flex-row">
        <QueryProvider>
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
            <Topbar />
            {children}
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
