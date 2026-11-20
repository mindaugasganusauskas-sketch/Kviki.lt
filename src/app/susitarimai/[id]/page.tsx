import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Building2, CalendarClock, Mail, Navigation, Phone, Repeat, User } from "lucide-react";
import { getAgreement } from "@/server/services/agreements";
import { markReadByLink } from "@/server/services/notifications";
import { getRequestView } from "@/server/services/requests";
import { AppError } from "@/server/errors";
import { requirePageActor } from "@/lib/require";
import { businessFormLabel, formatDateKey, formatDateTime, formatPrice, frequencyLabel } from "@/shared/format";
import type { AgreementDTO, VisitDTO } from "@/shared/types";
import { ActionButton } from "@/components/action-button";
import { AutoRefresh } from "@/components/auto-refresh";
import { mapsLink } from "@/components/request-summary";
import { AgreementStatusBadge, VisitStatusBadge } from "@/components/status";
import { Alert, Card, DefinitionRow, DemoBadge, PageHeader, SectionTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Užsakymas" };

function VisitActions({ a, v }: { a: AgreementDTO; v: VisitDTO }) {
  if (a.status !== "active") return null;
  const role = a.viewerRole;
  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {role === "provider" && (v.status === "scheduled" || v.status === "problem") && (
        <ActionButton endpoint={`/api/v1/visits/${v.id}/done`} label={v.status === "problem" ? "Pataisiau – pažymėti atliktu" : "Pažymėti atliktu"} />
      )}
      {role === "client" && (v.status === "done" || v.status === "problem") && (
        <ActionButton endpoint={`/api/v1/visits/${v.id}/confirm`} label="Patvirtinti rezultatą" />
      )}
      {role === "client" && v.status === "done" && (
        <ActionButton
          endpoint={`/api/v1/visits/${v.id}/problem`}
          label="Pažymėti problemą"
          variant="outline"
          reasonLabel="Kas negerai?"
          reasonRequired
        />
      )}
      {a.frequency && v.status === "scheduled" && (
        <ActionButton
          endpoint={`/api/v1/visits/${v.id}/cancel`}
          label="Atšaukti šį vizitą"
          variant="ghost"
          reasonLabel="Priežastis (nebūtina)"
          confirm="Bus atšauktas tik šis vizitas. Kiti liks suplanuoti."
        />
      )}
    </div>
  );
}

function VisitRow({ v, perVisitPrice }: { v: VisitDTO; perVisitPrice?: string }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2.5">
      <span className="font-medium">
        {formatDateTime(v.scheduledAt)}
        {perVisitPrice && <span className="ml-2 text-sm text-muted">{perVisitPrice}</span>}
      </span>
      <span className="flex items-center gap-2">
        {v.cancelledBy && <span className="text-xs text-muted">{v.cancelledBy === "client" ? "atšaukė klientas" : "atšaukė teikėjas"}</span>}
        <VisitStatusBadge status={v.status} />
      </span>
    </li>
  );
}

export default async function AgreementPage(props: PageProps<"/susitarimai/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const actor = await requirePageActor(`/susitarimai/${id}`);
  let a: AgreementDTO;
  try {
    a = await getAgreement(actor, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  await markReadByLink(actor, `/susitarimai/${id}`);
  const isClient = a.viewerRole === "client";
  const requestStatus = isClient ? (await getRequestView(actor, a.requestId)).status : null;

  const now = Date.now();
  const openVisits = a.visits.filter((v) => v.status === "scheduled" || v.status === "done" || v.status === "problem");
  const next = openVisits[0] ?? null;
  const later = openVisits.slice(1);
  const history = a.visits.filter((v) => !openVisits.includes(v)).reverse();
  const counterpartLabel = isClient ? "Teikėjas" : "Klientas";

  return (
    <div className="space-y-5">
      {a.status === "active" && <AutoRefresh seconds={30} />}
      <PageHeader
        back={isClient ? { href: "/mano-uzklausos", label: "Mano užklausos" } : { href: "/mano-darbai", label: "Mano darbai" }}
        title={a.headline}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <AgreementStatusBadge status={a.status} />
            {a.isDemo && <DemoBadge />}
            <span className="text-sm">
              {a.locality}, {a.municipalityLabel}
            </span>
          </span>
        }
      />

      {sp.sutarta === "1" && a.status === "active" && (
        <Alert tone="success" title="Susitarta!">
          {a.provider.name} gavo jūsų adresą ir kontaktą. Ši kortelė vienoda jums abiem.
        </Alert>
      )}

      {(a.status === "cancelled" || a.status === "ended") && (
        <Alert
          tone="warning"
          title={
            a.status === "ended"
              ? `${a.cancelledBy === "client" ? "Klientas" : "Teikėjas"} nutraukė būsimus vizitus`
              : `${a.cancelledBy === "client" ? "Klientas" : "Teikėjas"} atšaukė užsakymą`
          }
          action={
            isClient && requestStatus === "on_hold" ? (
              <ActionButton endpoint={`/api/v1/requests/${a.requestId}/reopen`} label="Ieškoti kito teikėjo" redirectTo={`/uzklausos/${a.requestId}`} />
            ) : undefined
          }
        >
          {a.cancelledAt && <>Kada: {formatDateTime(a.cancelledAt)}. </>}
          {a.cancelReason && <>Priežastis: {a.cancelReason}. </>}
          {a.status === "ended" && "Ankstesnių vizitų istorija išsaugota."}
        </Alert>
      )}

      {a.status === "completed" && <Alert tone="success" title="Darbas užbaigtas">Ačiū, kad naudojatės Kviki.</Alert>}

      {next && a.status === "active" && (
        <Card className="border-brand-300 ring-1 ring-brand-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{a.frequency ? "Kitas vizitas" : "Darbas"}</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-2 text-xl font-bold">
              <CalendarClock className="size-6 text-brand-600" aria-hidden />
              {formatDateTime(next.scheduledAt)}
            </p>
            <VisitStatusBadge status={next.status} />
          </div>
          {next.status === "done" && (
            <p className="mt-2 text-sm">
              {isClient ? "Teikėjas pažymėjo darbą atliktu. Ar viskas gerai?" : "Laukiama, kol klientas patvirtins rezultatą."}
            </p>
          )}
          {next.status === "problem" && next.problemNote && (
            <Alert tone="error" className="mt-3" title="Kliento pastaba">
              {next.problemNote}
            </Alert>
          )}
          {next.status === "scheduled" && new Date(next.scheduledAt).getTime() < now && !isClient && (
            <p className="mt-2 text-sm text-sun-700">Laikas jau atėjo – atlikę darbą pažymėkite jį.</p>
          )}
          <VisitActions a={a} v={next} />
        </Card>
      )}

      <Card>
        <h2 className="text-lg font-bold">Sutartos sąlygos</h2>
        <dl className="mt-2 divide-y divide-line">
          <DefinitionRow label={a.perVisit ? "Kaina už vieną vizitą" : "Galutinė kaina"}>
            <span className="text-2xl font-extrabold">{formatPrice(a.priceCents)}</span>
          </DefinitionRow>
          <DefinitionRow label={a.frequency ? "Pirmas vizitas" : "Pradžia"}>{formatDateTime(a.startAt)}</DefinitionRow>
          {a.frequency && (
            <DefinitionRow label="Periodiškumas">
              <span className="inline-flex items-center gap-1.5">
                <Repeat className="size-4 text-brand-600" aria-hidden />
                {frequencyLabel(a.frequency)}
                {a.seriesEnd ? `, iki ${formatDateKey(a.seriesEnd).toLowerCase()}` : ", be pabaigos datos"}
              </span>
            </DefinitionRow>
          )}
          <DefinitionRow label="Kas įskaičiuota">{a.included}</DefinitionRow>
          {a.detailLines.length > 0 && <DefinitionRow label="Apimtis">{a.detailLines.join(" · ")}</DefinitionRow>}
          {a.description && (
            <DefinitionRow label="Aprašymas">
              <span className="whitespace-pre-line font-normal">{a.description}</span>
            </DefinitionRow>
          )}
          <DefinitionRow label="Apmokėjimas">Tiesiogiai teikėjui{a.perVisit ? " už kiekvieną vizitą" : ""}</DefinitionRow>
        </dl>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold">{counterpartLabel}</h2>
          {isClient ? (
            <div className="mt-2 space-y-1.5">
              <p className="inline-flex items-center gap-1.5 font-semibold">
                {a.provider.businessForm === "company" ? <Building2 className="size-4 text-brand-600" aria-hidden /> : <User className="size-4 text-brand-600" aria-hidden />}
                {a.provider.name}
              </p>
              <p className="text-sm text-muted">{businessFormLabel(a.provider.businessForm)}</p>
              <ContactLinks phone={a.provider.phone} email={a.provider.email} />
            </div>
          ) : (
            <div className="mt-2 space-y-1.5">
              <p className="inline-flex items-center gap-1.5 font-semibold">
                <User className="size-4 text-brand-600" aria-hidden /> {a.client.name}
              </p>
              <ContactLinks phone={a.client.phone} email={a.client.email} />
            </div>
          )}
        </Card>
        <Card>
          <h2 className="text-lg font-bold">Darbo vieta</h2>
          <p className="mt-2 font-semibold">{a.location.address}</p>
          <p className="text-sm text-muted">
            {a.locality}, {a.municipalityLabel}
          </p>
          <a href={mapsLink(a.location)} target="_blank" rel="noopener" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
            <Navigation className="size-4" aria-hidden /> Atidaryti žemėlapyje
          </a>
        </Card>
      </div>

      {a.frequency && (later.length > 0 || history.length > 0) && (
        <Card>
          {later.length > 0 && (
            <>
              <h2 className="text-lg font-bold">Vėlesni vizitai</h2>
              <ul className="mt-1 divide-y divide-line">
                {later.slice(0, 4).map((v) => (
                  <li key={v.id}>
                    <VisitRow v={v} />
                    <VisitActions a={a} v={v} />
                  </li>
                ))}
              </ul>
              {later.length > 4 && <p className="mt-2 text-sm text-muted">ir dar {later.length - 4} suplanuoti vizitai</p>}
            </>
          )}
          {history.length > 0 && (
            <>
              <h2 className={later.length ? "mt-6 text-lg font-bold" : "text-lg font-bold"}>Istorija</h2>
              <ul className="mt-1 divide-y divide-line">
                {history.map((v) => (
                  <VisitRow key={v.id} v={v} />
                ))}
              </ul>
            </>
          )}
        </Card>
      )}

      {!a.frequency && history.length > 0 && a.status !== "active" && (
        <Card>
          <SectionTitle>Istorija</SectionTitle>
          <ul className="divide-y divide-line">
            {history.map((v) => (
              <VisitRow key={v.id} v={v} />
            ))}
          </ul>
        </Card>
      )}

      {a.status === "active" && (
        <div className="flex justify-end">
          <ActionButton
            endpoint={`/api/v1/agreements/${a.id}/cancel`}
            label={a.frequency ? "Nutraukti būsimus vizitus" : "Atšaukti užsakymą"}
            variant="danger"
            reasonLabel="Priežastis (nebūtina)"
            confirm={
              a.frequency
                ? "Visi būsimi vizitai bus atšaukti. Ankstesnių vizitų istorija liks."
                : `${isClient ? "Teikėjas" : "Klientas"} gaus pranešimą apie atšaukimą.`
            }
          />
        </div>
      )}
    </div>
  );
}

function ContactLinks({ phone, email }: { phone: string | null; email: string }) {
  return (
    <div className="flex flex-col gap-1 pt-1 text-sm">
      {phone && (
        <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline">
          <Phone className="size-4" aria-hidden /> {phone}
        </a>
      )}
      {email ? (
        <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline">
          <Mail className="size-4" aria-hidden /> {email}
        </a>
      ) : (
        <span className="text-muted">Paskyra ištrinta – kontaktai nebepasiekiami</span>
      )}
    </div>
  );
}
