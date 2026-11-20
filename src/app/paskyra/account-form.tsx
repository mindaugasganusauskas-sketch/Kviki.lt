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

/** Paskyros ištrynimas su slaptažodžio patvirtinimu. */
export function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button variant="danger" onClick={() => setOpen(true)}>
        Ištrinti paskyrą
      </Button>
    );
  }
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        try {
          await api("/api/v1/me/delete", { json: { password } });
          router.push("/?paskyra=istrinta");
          router.refresh();
        } catch (err) {
          setError((err as Error).message);
          setPending(false);
        }
      }}
    >
      <Alert tone="warning" title="Ar tikrai?">
        Bus ištrinti jūsų vardas, kontaktai, adresai, užklausų aprašymai ir nuotraukos. Atviros užklausos bus atšauktos, aktyvūs
        pasiūlymai atsiimti. Kitai sandorio šaliai liks tik nuasmeninta užsakymų istorija. Atkurti paskyros nebus galima.
      </Alert>
      <Field label="Patvirtinkite slaptažodžiu" htmlFor="del-pass">
        <Input id="del-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="danger" loading={pending} disabled={!password}>
          Ištrinti visam laikui
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Atšaukti
        </Button>
      </div>
    </form>
  );
}

/** Slaptažodžio keitimas. Kiti įrenginiai po pakeitimo atjungiami. */
export function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [state, setState] = useState<{ pending: boolean; error: string | null; saved: boolean }>({ pending: false, error: null, saved: false });
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setState({ pending: true, error: null, saved: false });
        try {
          await api("/api/v1/me/password", { json: { currentPassword: current, newPassword: next } });
          setCurrent("");
          setNext("");
          setState({ pending: false, error: null, saved: true });
        } catch (err) {
          setState({ pending: false, error: (err as Error).message, saved: false });
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Dabartinis slaptažodis" htmlFor="pw-current">
          <Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="Naujas slaptažodis" htmlFor="pw-new" hint="Bent 8 simboliai">
          <Input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
      </div>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.saved && <Alert tone="success">Slaptažodis pakeistas. Kituose įrenginiuose reikės prisijungti iš naujo.</Alert>}
      <Button type="submit" variant="outline" loading={state.pending} disabled={!current || next.length < 8}>
        Keisti slaptažodį
      </Button>
    </form>
  );
}
