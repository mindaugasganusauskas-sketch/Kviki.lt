"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  ArrowLeftRight,
  Bell,
  ClipboardList,
  House,
  ListChecks,
  LogIn,
  MapPin,
  Plus,
  User,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { cx } from "./ui";
import type { Mode } from "@/shared/types";
import { useI18n } from "@/i18n/client";
import type { Dict } from "@/i18n";

interface NavItem {
  href: string;
  label: string;
  icon: typeof House;
  primary?: boolean;
  badge?: boolean;
}

function itemsFor(state: "guest" | Mode, t: Dict): NavItem[] {
  if (state === "guest")
    return [
      { href: "/", label: t.nav.home, icon: House },
      { href: "/nauja-uzklausa", label: t.nav.newRequest, icon: Plus, primary: true },
      { href: "/prisijungti", label: t.nav.login, icon: LogIn },
    ];
  if (state === "provider")
    return [
      { href: "/darbai-salia", label: t.nav.nearby, icon: MapPin },
      { href: "/mano-darbai", label: t.nav.myJobs, icon: ListChecks },
      { href: "/pranesimai", label: t.nav.notifications, icon: Bell, badge: true },
      { href: "/paskyra", label: t.nav.account, icon: User },
    ];
  return [
    { href: "/nauja-uzklausa", label: t.nav.newRequest, icon: Plus, primary: true },
    { href: "/mano-uzklausos", label: t.nav.myRequests, icon: ClipboardList },
    { href: "/pranesimai", label: t.nav.notifications, icon: Bell, badge: true },
    { href: "/paskyra", label: t.nav.account, icon: User },
  ];
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/mano-uzklausos") return pathname.startsWith("/mano-uzklausos") || pathname.startsWith("/uzklausos");
  if (href === "/mano-darbai") return pathname.startsWith("/mano-darbai") || pathname.startsWith("/susitarimai");
  return pathname.startsWith(href);
}

function useUnread(initial: number, enabled: boolean) {
  const [count, setCount] = useState(initial);
  const pathname = usePathname();
  useEffect(() => setCount(initial), [initial]);
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await api<{ unread: number }>("/api/v1/notifications/unread-count");
        if (!stopped) setCount(r.unread);
      } catch {
        /* tylus bandymas – kitą kartą pavyks */
      }
    };
    const id = setInterval(tick, 45_000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [enabled, pathname]);
  return count;
}

export function TopNav({ state, unread }: { state: "guest" | Mode; unread: number }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const count = useUnread(unread, state !== "guest");
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label={t.nav.main}>
      {itemsFor(state, t).map((it) => {
        const active = isActive(pathname, it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cx(
              "relative inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors",
              it.primary
                ? "bg-sun-400 text-ink shadow-sm hover:bg-sun-300"
                : active
                  ? "bg-brand-50 text-brand-800"
                  : "text-stone-700 hover:bg-stone-100",
            )}
          >
            <it.icon className="size-4" aria-hidden />
            {it.label}
            {it.badge && count > 0 && (
              <span className="ml-0.5 rounded-full bg-berry-500 px-1.5 text-xs font-bold text-white" aria-label={t.nav.unread(count)}>
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav({ state, unread }: { state: "guest" | Mode; unread: number }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const count = useUnread(unread, state !== "guest");
  const items = itemsFor(state, t);
  return (
    <nav
      className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur md:hidden"
      aria-label={t.nav.bottom}
    >
      <ul className={cx("mx-auto grid max-w-lg", items.length === 3 ? "grid-cols-3" : "grid-cols-4")}>
        {items.map((it) => {
          const active = isActive(pathname, it.href);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={cx(
                  "relative flex flex-col items-center gap-0.5 px-1 pb-2 pt-2 text-[11px] font-semibold",
                  active ? "text-brand-700" : "text-stone-500",
                )}
              >
                {it.primary ? (
                  <span className="-mt-5 flex size-13 items-center justify-center rounded-full bg-sun-400 text-ink shadow-lg shadow-sun-600/30 ring-4 ring-white">
                    <it.icon className="size-6" aria-hidden />
                  </span>
                ) : (
                  <span className={cx("flex h-7 w-12 items-center justify-center rounded-full", active && "bg-brand-100")}>
                    <it.icon className="size-5" aria-hidden />
                  </span>
                )}
                <span className="leading-tight">{it.label}</span>
                {it.badge && count > 0 && (
                  <span className="absolute right-[22%] top-1 min-w-4 rounded-full bg-berry-500 px-1 text-center text-[10px] font-bold text-white">
                    {count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Kliento ir teikėjo režimų perjungimas. Ankstesni užsakymai nesikeičia. */
export function ModeSwitch({ mode, className }: { mode: Mode; className?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const next: Mode = mode === "client" ? "provider" : "client";
  return (
    <div className={className}>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              setError(null);
              await api("/api/v1/me/mode", { json: { mode: next } });
              router.push(next === "provider" ? "/darbai-salia" : "/mano-uzklausos");
              router.refresh();
            } catch (e) {
              setError((e as Error).message);
            }
          })
        }
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        title={t.nav.switchMode}
      >
        <ArrowLeftRight className="size-3.5" aria-hidden />
        {mode === "client" ? t.nav.modeClient : t.nav.modeProvider}
        <span className="hidden text-muted sm:inline">{next === "client" ? t.nav.toClient : t.nav.toProvider}</span>
      </button>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
