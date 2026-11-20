"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { Alert, Button, Textarea } from "./ui";

/**
 * Mygtukas, kuris iškviečia API veiksmą ir atnaujina puslapį.
 * Su `confirm` pirmiausia paprašo patvirtinimo, su `reasonLabel` – leidžia įrašyti priežastį.
 */
export function ActionButton({
  endpoint,
  label,
  variant = "primary",
  confirm,
  reasonLabel,
  reasonRequired = false,
  redirectTo,
  size = "md",
  className,
  body,
}: {
  endpoint: string;
  label: string;
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  confirm?: string;
  reasonLabel?: string;
  reasonRequired?: boolean;
  redirectTo?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  body?: Record<string, unknown>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setError(null);
    try {
      const key = reasonRequired ? "note" : "reason";
      await api(endpoint, { json: { ...body, ...(reasonLabel ? { [key]: reason } : {}) } });
      setOpen(false);
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  if (!confirm && !reasonLabel) {
    return (
      <span className={className}>
        <Button variant={variant} size={size} onClick={run} loading={pending} className="w-full sm:w-auto">
          {label}
        </Button>
        {error && <Alert tone="error" className="mt-2">{error}</Alert>}
      </span>
    );
  }

  return (
    <div className={className}>
      {!open ? (
        <Button variant={variant} size={size} onClick={() => setOpen(true)} className="w-full sm:w-auto">
          {label}
        </Button>
      ) : (
        <div className="space-y-3 rounded-xl border border-line bg-white p-3.5">
          {confirm && <p className="text-sm font-medium">{confirm}</p>}
          {reasonLabel && (
            <label className="block text-sm font-semibold">
              {reasonLabel}
              <Textarea className="mt-1.5" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
            </label>
          )}
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex flex-wrap gap-2">
            <Button variant={variant === "danger" ? "danger" : "primary"} size="sm" onClick={run} loading={pending} disabled={reasonRequired && reason.trim().length < 3}>
              Patvirtinti
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
              Atšaukti
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
