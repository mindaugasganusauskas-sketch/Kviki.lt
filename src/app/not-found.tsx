import { ButtonLink, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <EmptyState title="Puslapis nerastas" action={<ButtonLink href="/">Į pradžią</ButtonLink>}>
      Galbūt nuoroda pasenusi arba šis įrašas jums nepasiekiamas.
    </EmptyState>
  );
}
