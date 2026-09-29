import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NavLink } from "@/components/NavLink";
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
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <header className="sticky top-0 z-40 border-b border-border-color/70 bg-background/70 backdrop-blur-md">
            <nav className="mx-auto flex max-w-[96rem] items-center justify-between px-6 py-4">
              <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-sm"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent) 40%, var(--success)))",
                    color: "var(--accent-foreground)",
                  }}
                >
                  ⛽
                </span>
                Fuel Price Predictor
              </Link>
              <div className="flex items-center gap-6">
                <NavLink href="/">Dashboard</NavLink>
                <NavLink href="/history">History</NavLink>
                <NavLink href="/methodology">Methodology</NavLink>
                <ThemeToggle />
              </div>
            </nav>
          </header>
          <main className="mx-auto w-full max-w-[96rem] flex-1 px-6 py-10">{children}</main>
          <footer className="border-t border-border-color px-6 py-6 text-center text-xs text-muted">
            Estimates only — not affiliated with CPC or Lanka IOC. See the{" "}
            <Link href="/methodology" className="underline underline-offset-2">
              methodology
            </Link>{" "}
            page for how predictions are calculated and their limitations.
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
