import type { Metadata, Viewport } from "next";
import { Ubuntu } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { StoreHydrator } from "@/components/shared/store-hydrator";

// One family for the whole site. Ubuntu isn't a variable font, so each weight is
// listed; latin-ext covers Twi letters such as ɛ and ɔ in names and addresses.
const ubuntu = Ubuntu({
  variable: "--font-ubuntu",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KumBola",
  description:
    "Ride-hailing for waste: KumBola coordinates vetted Aboboyaa tricycle operators for reliable, verified waste collection in Greater Kumasi. Book a pickup, track it, and get proof your waste reached an approved site.",
  keywords: [
    "KumBola", "waste collection", "Kumasi", "Ghana", "Aboboyaa", "tricycle",
    "sanitation", "recycling", "proof of disposal", "mobile money",
  ],
  authors: [{ name: "KoomBei Digital Limited" }],
  openGraph: {
    title: "KumBola",
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
        className={`${ubuntu.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <StoreHydrator />
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
