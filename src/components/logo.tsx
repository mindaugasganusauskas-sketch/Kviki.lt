export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#386e2c" />
      <path d="M7 24c3-1 5.5-4.5 6.5-10.5" stroke="#bbdab1" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M13 24c2.5-2 4-6 4-12" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M19 24c2-1.5 3.5-4.5 4.5-8.5" stroke="#f6a823" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M6 25h20" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="text-xl font-extrabold tracking-tight text-brand-800">Kviki</span>
    </span>
  );
}
