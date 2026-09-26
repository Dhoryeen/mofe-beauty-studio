import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Mofe Beauty Studio",
  description: "Design a look, approve the plan, book and follow through."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-black/10 bg-cream">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <a href="/" className="font-semibold tracking-tight">
              Mofe Beauty Studio
            </a>
            <nav className="flex gap-4 text-sm">
              <a href="/gallery">Gallery</a>
              <a href="/services">Services</a>
              <a href="/design-system">Design system</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
