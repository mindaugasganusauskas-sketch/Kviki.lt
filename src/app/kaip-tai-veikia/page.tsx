import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { ButtonLink, Card, PageHeader } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.titles.how };
}

export default async function HowPage() {
  const { t } = await getI18n();
  const h = t.how;
  const sections: [string, string[][]][] = [
    [h.clients, h.clientSteps],
    [h.providers, h.providerSteps],
  ];
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t.titles.how} subtitle={h.subtitle} />
      {sections.map(([title, steps]) => (
        <Card key={title}>
          <h2 className="text-lg font-bold">{title}</h2>
          <ol className="mt-3 space-y-3">
            {steps.map(([name, text], i) => (
              <li key={name} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">{i + 1}</span>
                <span>
                  <span className="font-semibold">{name}.</span> <span className="text-stone-700">{text}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      ))}
      <Card>
        <h2 className="text-lg font-bold">{h.paymentTitle}</h2>
        <p className="mt-2 text-stone-700">{h.paymentText}</p>
      </Card>
      <div className="flex flex-wrap gap-2">
        <ButtonLink href="/nauja-uzklausa">{h.describe}</ButtonLink>
        <ButtonLink href="/registracija?teikejas=1" variant="outline">
          {h.become}
        </ButtonLink>
      </div>
    </div>
  );
}
