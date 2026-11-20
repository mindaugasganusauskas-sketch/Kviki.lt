"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import type { UserDTO } from "@/shared/types";
import { Alert, Button, Field, Input, cx } from "./ui";

type Tab = "register" | "login";

export function AuthForm({
  initialTab = "register",
  onSuccess,
  defaults,
  providerIntent = false,
  submitLabel,
}: {
  initialTab?: Tab;
  onSuccess: (user: UserDTO) => void | Promise<void>;
  defaults?: { name?: string; phone?: string };
  providerIntent?: boolean;
  submitLabel?: { register?: string; login?: string };
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [name, setName] = useState(defaults?.name ?? "");
  const [phone, setPhone] = useState(defaults?.phone ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res =
        tab === "register"
          ? await api<{ user: UserDTO }>("/api/v1/auth/register", {
              json: { name, email, password, phone: phone || null },
            })
          : await api<{ user: UserDTO }>("/api/v1/auth/login", { json: { email, password } });
      await onSuccess(res.user);
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 rounded-xl bg-stone-100 p-1" role="tablist">
        {(
          [
            ["register", "Esu naujas"],
            ["login", "Jau turiu paskyrą"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              setError(null);
            }}
            className={cx(
              "h-10 rounded-lg text-sm font-semibold transition",
              tab === key ? "bg-white text-ink shadow-sm" : "text-stone-600 hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {tab === "register" && (
          <Field label="Vardas" htmlFor="auth-name">
            <Input id="auth-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
        )}
        <Field label="El. paštas" htmlFor="auth-email">
          <Input
            id="auth-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field
          label="Slaptažodis"
          htmlFor="auth-password"
          hint={tab === "register" ? "Bent 8 simboliai" : undefined}
        >
          <Input
            id="auth-password"
            type="password"
            autoComplete={tab === "register" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        {tab === "register" && (
          <Field label="Telefonas" htmlFor="auth-phone" optional hint="Jį matys tik tas teikėjas ar klientas, su kuriuo susitarsite.">
            <Input
              id="auth-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+370 600 00000"
            />
          </Field>
        )}
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          {tab === "register" ? (submitLabel?.register ?? "Sukurti paskyrą") : (submitLabel?.login ?? "Prisijungti")}
        </Button>
      </form>
    </div>
  );
}
