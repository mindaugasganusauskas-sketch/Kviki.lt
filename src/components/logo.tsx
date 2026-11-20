/** Kviki ženklas: varnelė – darbas atliktas, brūkšniai – greitai, saulė – kiemas ir laukas. */
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
      <circle cx="37" cy="11" r="4.6" fill="#ffc61a" />
      <path d="M5.5 23h6.5M7.5 29.5h4.5" stroke="#ffe27a" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M16 26.5l6.5 7 13-15" fill="none" stroke="#fff" strokeWidth="6.2" strokeLinecap="round" strokeLinejoin="round" />
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
