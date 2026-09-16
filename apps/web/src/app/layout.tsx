import type { Metadata } from "next";
import { Geist_Mono, Space_Grotesk } from "next/font/google";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "soroshares",
  description: "DPRI public offer on Stellar (testnet)",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>
          <header className="border-b">
            <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
              <span className="font-semibold">soroshares</span>
              <Badge variant="outline">Testnet</Badge>
            </div>
          </header>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
