import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { brand } from "@/lib/brand";
import "./globals.css";
const bodyFont = localFont({
  src: "../public/fonts/dm-sans.ttf",
  weight: "100 1000",
  variable: "--font-body",
  display: "swap",
});
const headingFont = localFont({
  src: "../public/fonts/manrope.ttf",
  weight: "200 800",
  variable: "--font-heading",
  display: "swap",
});
export const metadata: Metadata = {
  title: {
    default: `${brand.name} — Movies feel better together`,
    template: `%s · ${brand.name}`,
  },
  description: brand.description,
  applicationName: brand.name,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: brand.name,
  },
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
};
export const viewport: Viewport = {
  themeColor: "#09090e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${bodyFont.variable} ${headingFont.variable}`}>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
