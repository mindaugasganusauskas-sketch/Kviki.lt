/** Kviki ženklas: žaibas – greitai, žolės stiebai – kiemas. */
export function LogoMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="kviki-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34d56f" />
          <stop offset="1" stopColor="#0f8a40" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#kviki-g)" />
      <path d="M27.5 6.5 14 27h9.5l-3 14.5L35 20.5h-9.5z" fill="#ffc61a" />
      <path
        d="M10 41.5c2.4-2 3.8-5.2 4.2-9.5M15.5 41.5c1.6-1.8 2.4-4.2 2.6-7"
        stroke="#d9f9e3"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-[22px] font-extrabold tracking-tight text-ink">
        Kviki<span className="text-brand-500">.</span>
      </span>
    </span>
  );
}
