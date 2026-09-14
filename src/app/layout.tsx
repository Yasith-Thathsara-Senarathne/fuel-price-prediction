import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sri Lanka Fuel Price Predictor",
  description:
    "Tracking and predicting Sri Lanka fuel prices from CPC/Lanka IOC data, exchange rates, and global crude oil prices.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-semibold tracking-tight">
              🇱🇰 Fuel Price Predictor
            </Link>
            <div className="flex gap-6 text-sm text-zinc-600 dark:text-zinc-400">
              <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Dashboard
              </Link>
              <Link href="/history" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                History
              </Link>
              <Link href="/methodology" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Methodology
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
        <footer className="border-t border-zinc-200 px-6 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
          Estimates only — not affiliated with CPC or Lanka IOC. See the{" "}
          <Link href="/methodology" className="underline">
            methodology
          </Link>{" "}
          page for how predictions are calculated and their limitations.
        </footer>
      </body>
    </html>
  );
}
