import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const manrope = Manrope({
  variable: "--font-sans-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "KumBola — Kum Bola: kill trash",
  description:
    "Ride-hailing for waste: KumBola coordinates vetted Aboboyaa tricycle operators for reliable, verified waste collection in Greater Kumasi. Book a pickup, track it, and get proof your waste reached an approved site.",
  keywords: [
    "KumBola", "waste collection", "Kumasi", "Ghana", "Aboboyaa", "tricycle",
    "sanitation", "recycling", "proof of disposal", "mobile money",
  ],
  authors: [{ name: "KoomBei Digital Limited" }],
  openGraph: {
    title: "KumBola — Kum Bola: kill trash",
    description:
      "Book a vetted Aboboyaa operator, pay by mobile money, and get GPS-verified proof your waste reached an approved disposal site.",
    siteName: "KumBola",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#3e5416",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body
        className={`${fraunces.variable} ${manrope.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
