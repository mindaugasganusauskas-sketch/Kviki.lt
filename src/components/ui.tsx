import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert } from "lucide-react";
import { OptionalLabel } from "./i18n-text";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 shadow-sm shadow-brand-900/10",
  accent: "bg-sun-400 text-ink hover:bg-sun-300 active:bg-sun-500 shadow-sm shadow-sun-600/20",
  secondary: "bg-brand-50 text-brand-800 hover:bg-brand-100 border border-brand-200",
  outline: "bg-white text-ink border border-line hover:bg-paper",
  ghost: "text-brand-700 hover:bg-brand-50",
  danger: "bg-white text-red-700 border border-red-200 hover:bg-red-50",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-[15px] gap-2",
  lg: "h-14 px-6 text-base gap-2",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cx(
    "inline-flex items-center justify-center rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none select-none",
    variants[variant],
    sizes[size],
    extra,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  ...rest
}: ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button {...rest} disabled={rest.disabled || loading} className={buttonClass(variant, size, className)}>
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return (
    <Link href={href} {...rest} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

export function Card({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div
      {...rest}
      className={cx("rounded-2xl border border-line/80 bg-white p-4 shadow-[0_1px_2px_rgba(11,31,18,0.04),0_8px_24px_-12px_rgba(11,31,18,0.10)] sm:p-5", className)}
    >
      {children}
    </div>
  );
}

type Tone = "neutral" | "green" | "amber" | "red" | "blue";
const tones: Record<Tone, string> = {
  neutral: "bg-stone-100 text-stone-700",
  green: "bg-brand-100 text-brand-800",
  amber: "bg-sun-100 text-sun-700",
  red: "bg-red-100 text-red-800",
  blue: "bg-sky-100 text-sky-800",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", tones[tone], className)}>
      {children}
    </span>
  );
}

export function DemoBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-ink px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-sun-300">
      Demo
    </span>
  );
}

const alertStyles = {
  info: { box: "bg-sky-50 border-sky-200 text-sky-900", Icon: Info },
  success: { box: "bg-brand-50 border-brand-200 text-brand-900", Icon: CircleCheck },
  warning: { box: "bg-sun-50 border-sun-200 text-sun-700", Icon: TriangleAlert },
  error: { box: "bg-red-50 border-red-200 text-red-900", Icon: CircleAlert },
} as const;

export function Alert({
  tone = "info",
  title,
  children,
  className,
  action,
}: {
  tone?: keyof typeof alertStyles;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  const { box, Icon } = alertStyles[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("flex gap-3 rounded-xl border p-3.5 text-sm", box, className)}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cx(title ? "mt-0.5" : "", "leading-relaxed")}>{children}</div>}
        {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-white px-6 py-10 text-center">
      {icon && <div className="mb-3 rounded-full bg-brand-50 p-3 text-brand-600">{icon}</div>}
      <p className="text-lg font-semibold">{title}</p>
      {children && <div className="mt-1 max-w-md text-muted">{children}</div>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  action?: ReactNode;
}) {
  return (
    <div className="mb-5">
      {back && (
        <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <div className="mt-1 text-muted">{subtitle}</div>}
        </div>
        {action}
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  optional,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  htmlFor?: string;
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold">
        {label}
        {optional && <OptionalLabel />}
      </label>
      {children}
      {hint && !error && <p className="text-xs leading-relaxed text-muted">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-700">{error}</p>}
    </div>
  );
}

export const inputClass =
  "block w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[16px] text-ink placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-stone-50";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cx(inputClass, "h-11", props.className)} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea rows={3} {...props} className={cx(inputClass, "min-h-[5rem]", props.className)} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={cx(inputClass, "h-11 pr-8", props.className)} />;
}

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <LoaderCircle
      className={cx("size-5 animate-spin text-brand-600", className)}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-8 flex items-center justify-between gap-3 first:mt-0">
      <h2 className="text-lg font-bold">{children}</h2>
      {action}
    </div>
  );
}

export function DefinitionRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
      <dt className="w-44 shrink-0 text-sm text-muted">{label}</dt>
      <dd className="min-w-0 font-medium">{children}</dd>
    </div>
  );
}
