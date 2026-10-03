import "./globals.css";
import type { ReactNode } from "react";
import { getSession } from "@/lib/session";
import { SignOutButton } from "@/components/SignOutButton";

export const metadata = {
  title: "Mofe Beauty Studio",
  description: "Design a look, approve the plan, book and follow through."
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  const role = (session?.user as { role?: string } | undefined)?.role;

  return (
    <html lang="en">
      <body>
        <header className="border-b border-black/10 bg-cream">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <a href="/" className="font-semibold tracking-tight">
              Mofe Beauty Studio
            </a>
            <nav className="flex items-center gap-4 text-sm">
              <a href="/gallery">Gallery</a>
              <a href="/services">Services</a>
              <a href="/demo">Demo</a>
              {session?.user && <a href="/book">Book</a>}
              {session?.user && <a href="/requests/new">Request date</a>}
              {session?.user && <a href="/bookings">My bookings</a>}
              {session?.user && <a href="/groups">Groups</a>}
              {session?.user && <a href="/consultations">Consultations</a>}
              {session?.user && <a href="/quotes">Quotes</a>}
              {session?.user && <a href="/looks">Looks</a>}
              {role === "manager" && <a href="/admin/requests">Requests</a>}
              {role === "manager" && <a href="/admin/changes">Changes</a>}
              {role === "manager" && <a href="/admin/quotes">Quotes admin</a>}
              {role === "beautician_consultant" && <a href="/admin/quotes">Propose quotes</a>}
              {role === "manager" && <a href="/admin/waitlist">Waitlist</a>}
              {role === "manager" && <a href="/admin/settings">Settings</a>}
              {role === "manager" && <a href="/admin/gallery">Gallery admin</a>}
              {session?.user ? (
                <>
                  <span className="text-muted">
                    {session.user.email} · {role ?? "client"}
                  </span>
                  <SignOutButton />
                </>
              ) : (
                <>
                  <a href="/sign-in">Sign in</a>
                  <a href="/sign-up">Sign up</a>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
