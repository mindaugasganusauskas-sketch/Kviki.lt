import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { getActor } from "@/server/auth/session";
import { unreadCount } from "@/server/services/notifications";
import { getI18n } from "@/i18n/server";
import { I18nProvider } from "@/i18n/client";
import { BottomNav, ModeSwitch, TopNav } from "@/components/nav";
import { DemoBar } from "@/components/demo-bar";
import { LanguageSwitch } from "@/components/language-switch";
import { Logo } from "@/components/logo";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return {
    title: { default: t.meta.title, template: "%s · Kviki" },
    description: t.meta.description,
    applicationName: "Kviki",
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_GB" : "lt_LT",
      siteName: "Kviki",
      title: t.meta.title,
      description: t.meta.description,
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "Kviki" }],
    },
    manifest: "/manifest.webmanifest",
    icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
  };
}

export const viewport: Viewport = {
  themeColor: "#0e7036",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getI18n();
  const actor = await getActor();
  const unread = actor ? await unreadCount(actor) : 0;
  const state = actor ? actor.mode : "guest";

  return (
    <html lang={locale}>
      <body className="font-sans antialiased">
        <I18nProvider locale={locale}>
          {actor?.isDemo && <DemoBar name={actor.name} />}
          <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4 md:h-16">
              <Link href="/" className="flex shrink-0 items-center gap-2" aria-label={t.common.home}>
                <Logo />
              </Link>
              <div className="flex items-center gap-2">
                {actor?.isProvider && <ModeSwitch mode={actor.mode} />}
                <TopNav state={state} unread={unread} />
                <LanguageSwitch />
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 md:pb-16 md:pt-8">{children}</main>
          <footer className="hidden border-t border-line py-8 text-sm text-muted md:block">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4">
              <span>
                © {new Date().getFullYear()} Kviki · {t.common.footer}
              </span>
              <span className="flex gap-4">
                <Link href="/kaip-tai-veikia" className="hover:text-ink">
                  {t.common.howItWorks}
                </Link>
                <Link href="/taisykles" className="hover:text-ink">
                  {t.common.terms}
                </Link>
                <Link href="/privatumas" className="hover:text-ink">
                  {t.common.privacy}
                </Link>
              </span>
            </div>
          </footer>
          <BottomNav state={state} unread={unread} />
        </I18nProvider>
      </body>
    </html>
  );
}
