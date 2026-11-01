import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP_NAME } from "@/config/app";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Fleet, jobs and dispatch management.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA">
      <body>{children}</body>
    </html>
  );
}
