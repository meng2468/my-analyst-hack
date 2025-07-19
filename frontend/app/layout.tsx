import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyAnalyst",
  description: "A voice empowered analyst to help you understand your data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`w-dvw h-dvh bg-gray-100 flex items-center justify-center`}
      >
        {children}
      </body>
    </html>
  );
}
