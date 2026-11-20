"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { api } from "@/lib/api-client";
import { Alert, Button, Field, Input } from "@/components/ui";

export function AccountForm({ name: n0, phone: p0 }: { name: string; phone: string }) {
  const router = useRouter();
  const [name, setName] = useState(n0);
  const [phone, setPhone] = useState(p0);
  const [state, setState] = useState<{ pending: boolean; error: string | null; saved: boolean }>({ pending: false, error: null, saved: false });
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setState({ pending: true, error: null, saved: false });
        try {
          await api("/api/v1/me", { method: "PATCH", json: { name, phone } });
          setState({ pending: false, error: null, saved: true });
          router.refresh();
        } catch (err) {
          setState({ pending: false, error: (err as Error).message, saved: false });
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Vardas" htmlFor="acc-name">
          <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </Field>
        <Field label="Telefonas" htmlFor="acc-phone" optional>
          <Input id="acc-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        </Field>
      </div>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.saved && <Alert tone="success">Išsaugota</Alert>}
      <Button type="submit" variant="outline" loading={state.pending}>
        Išsaugoti
      </Button>
    </form>
  );
}

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="ghost"
      loading={pending}
      onClick={async () => {
        setPending(true);
        try {
          await api("/api/v1/auth/logout", { json: {} });
        } finally {
          router.push("/");
          router.refresh();
        }
      }}
    >
      <LogOut className="size-4" aria-hidden /> Atsijungti
    </Button>
  );
}
