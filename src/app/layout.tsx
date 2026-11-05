import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP_NAME } from "@/config/app";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
  description: "A clear workspace for fleet, freight, finance and dispatch.",
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/transport-os-icon.svg", type: "image/svg+xml" }], shortcut: "/transport-os-icon.svg", apple: "/transport-os-icon.svg" },
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#17243b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en-ZA"><body>{children}</body></html>;
}
