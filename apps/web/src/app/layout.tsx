import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist_Mono, Space_Grotesk } from "next/font/google";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { GithubIcon } from "@/components/icons/github";
import { MarkdownDialog } from "@/components/markdown-dialog";
import { cn } from "cn";
import { Providers } from "./providers";
import "./globals.css";

const ipoExplainer = readFileSync(path.join(process.cwd(), "content/ipo-explainer.md"), "utf8");

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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>
          <header className="border-b">
            <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
              <span className="font-semibold uppercase">soroshares</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Testnet</Badge>
                <MarkdownDialog title="How this fixes oversubscription" content={ipoExplainer} />
                <a
                  href="https://github.com/devodii/soroshares"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="View source on GitHub"
                  className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
                >
                  <GithubIcon className="size-4" />
                </a>
                <ThemeToggle />
              </div>
            </div>
          </header>
          {children}
          <Toaster />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
