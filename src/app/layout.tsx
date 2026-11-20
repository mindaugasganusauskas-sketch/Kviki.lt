import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { getActor } from "@/server/auth/session";
import { unreadCount } from "@/server/services/notifications";
import { BottomNav, ModeSwitch, TopNav } from "@/components/nav";
import { DemoBar } from "@/components/demo-bar";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: { default: "Kviki – vietinė pagalba kiemo ir ūkio darbams", template: "%s · Kviki" },
  description:
    "Aprašykite darbą vieną kartą – vietos teikėjai pasiūlys kainą ir laiką. Žolės pjovimas, kiemo tvarkymas, genėjimas ir pagalbiniai darbai.",
  applicationName: "Kviki",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#386e2c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  const unread = actor ? await unreadCount(actor) : 0;
  const state = actor ? actor.mode : "guest";

  return (
    <html lang="lt">
      <body className="font-sans antialiased">
        {actor?.isDemo && <DemoBar name={actor.name} />}
        <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 md:h-16">
            <Link href="/" className="flex items-center gap-2" aria-label="Kviki – pradžia">
              <Logo />
            </Link>
            <div className="flex items-center gap-2">
              {actor?.isProvider && <ModeSwitch mode={actor.mode} />}
              <TopNav state={state} unread={unread} />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 md:pb-16 md:pt-8">{children}</main>
        <footer className="hidden border-t border-line py-8 text-sm text-muted md:block">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4">
            <span>© {new Date().getFullYear()} Kviki · Vietinė pagalba kiemo ir ūkio darbams</span>
            <span className="flex gap-4">
              <Link href="/kaip-tai-veikia" className="hover:text-ink">
                Kaip tai veikia
              </Link>
              <Link href="/taisykles" className="hover:text-ink">
                Taisyklės
              </Link>
              <Link href="/privatumas" className="hover:text-ink">
                Privatumas
              </Link>
            </span>
          </div>
        </footer>
        <BottomNav state={state} unread={unread} />
      </body>
    </html>
  );
}
