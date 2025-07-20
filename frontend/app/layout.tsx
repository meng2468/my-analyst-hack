import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import AnimatedBackground from "./_components/animated-background";

const font = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

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
      <body className={`w-dvw h-dvh flex items-center justify-center relative ${font.className}`}>
        <AnimatedBackground />
        <div className="relative z-10">
          <div className="text-9xl font-semibold text-center text-white mb-8">
          Your Personal Data Expert
          </div>
          <div className="text-3xl font-light text-center text-white mb-32">
            {/* Turn your spreadsheets into smart insights, just by talking. */}
          Upload your CSV, start a conversation, and get a professional data analysis delivered right into your inbox.
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}
