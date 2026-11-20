"use client";

import { Button, EmptyState } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState title="Nepavyko įkelti puslapio" action={<Button onClick={reset}>Bandyti dar kartą</Button>}>
      Gali būti, kad nutrūko interneto ryšys arba serveris laikinai nepasiekiamas.
    </EmptyState>
  );
}
