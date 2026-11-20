import { BadgeCheck } from "lucide-react";
import { ButtonLink, EmptyState } from "./ui";

export function ProviderGate() {
  return (
    <EmptyState
      icon={<BadgeCheck className="size-6" />}
      title="Užpildykite teikėjo profilį"
      action={<ButtonLink href="/paskyra/teikejas">Tapti teikėju</ButtonLink>}
    >
      Pasirinkite veiklos formą, paslaugas ir savivaldybes. Tada matysite jums tinkamus darbus šalia.
    </EmptyState>
  );
}
