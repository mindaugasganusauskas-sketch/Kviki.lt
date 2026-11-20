import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Building2, CalendarClock, Mail, Navigation, Phone, Repeat, User } from "lucide-react";
import { getAgreement } from "@/server/services/agreements";
import { markReadByLink } from "@/server/services/notifications";
import { getRequestView } from "@/server/services/requests";
import { AppError } from "@/server/errors";
import { requirePageActor } from "@/lib/require";
import { businessFormLabel, formatDateKey, formatDateTime, formatPrice, frequencyLabel, midSentence } from "@/shared/format";
import type { AgreementDTO, VisitDTO } from "@/shared/types";
import { describeDetails, requestHeadline } from "@/shared/categories";
import type { Locale } from "@/shared/locale";
import { getI18n } from "@/i18n/server";
import type { Dict } from "@/i18n";
import { ActionButton } from "@/components/action-button";
import { AutoRefresh } from "@/components/auto-refresh";
import { mapsLink } from "@/components/request-summary";
import { AgreementStatusBadge, VisitStatusBadge } from "@/components/status";
import { Alert, Card, DefinitionRow, DemoBadge, PageHeader, SectionTitle } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.titles.agreement };
}

function VisitActions({ a, v, t }: { a: AgreementDTO; v: VisitDTO; t: Dict }) {
  if (a.status !== "active") return null;
  const g = t.agreement;
  const role = a.viewerRole;
  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {role === "provider" && (v.status === "scheduled" || v.status === "problem") && (
        <ActionButton endpoint={`/api/v1/visits/${v.id}/done`} label={v.status === "problem" ? g.markDoneAgain : g.markDone} />
      )}
      {role === "client" && (v.status === "done" || v.status === "problem") && (
        <ActionButton endpoint={`/api/v1/visits/${v.id}/confirm`} label={g.confirmResult} />
      )}
      {role === "client" && v.status === "done" && (
        <ActionButton
          endpoint={`/api/v1/visits/${v.id}/problem`}
          label={g.reportProblem}
          variant="outline"
          reasonLabel={g.whatsWrong}
          reasonRequired
        />
      )}
      {a.frequency && v.status === "scheduled" && (
        <ActionButton
          endpoint={`/api/v1/visits/${v.id}/cancel`}
          label={g.cancelVisit}
          variant="ghost"
          reasonLabel={g.reasonOptional}
          confirm={g.cancelVisitConfirm}
        />
      )}
    </div>
  );
}

function VisitRow({ v, perVisitPrice, t, locale }: { v: VisitDTO; perVisitPrice?: string; t: Dict; locale: Locale }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2.5">
      <span className="font-medium">
        {formatDateTime(v.scheduledAt, locale)}
        {perVisitPrice && <span className="ml-2 text-sm text-muted">{perVisitPrice}</span>}
      </span>
      <span className="flex items-center gap-2">
        {v.cancelledBy && <span className="text-xs text-muted">{v.cancelledBy === "client" ? t.agreement.cancelledByClientShort : t.agreement.cancelledByProviderShort}</span>}
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
  const { locale, t } = await getI18n();
  const g = t.agreement;
  const isClient = a.viewerRole === "client";
  const requestStatus = isClient ? (await getRequestView(actor, a.requestId)).status : null;

  const now = Date.now();
  const openVisits = a.visits.filter((v) => v.status === "scheduled" || v.status === "done" || v.status === "problem");
  const next = openVisits[0] ?? null;
  const later = openVisits.slice(1);
  const history = a.visits.filter((v) => !openVisits.includes(v)).reverse();
  const counterpartLabel = isClient ? t.offers.colProvider : g.clientWord;
  const who = (role: "client" | "provider" | null) => (role === "client" ? g.clientWord : g.providerWord);

  return (
    <div className="space-y-5">
      {a.status === "active" && <AutoRefresh seconds={30} />}
      <PageHeader
        back={isClient ? { href: "/mano-uzklausos", label: t.titles.myRequests } : { href: "/mano-darbai", label: t.titles.myJobs }}
        title={requestHeadline(a.category, a.details, locale)}
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
        <Alert tone="success" title={g.agreedTitle}>
          {g.agreedText(a.provider.name)}
        </Alert>
      )}

      {(a.status === "cancelled" || a.status === "ended") && (
        <Alert
          tone="warning"
          title={
            a.status === "ended"
              ? g.endedBy(who(a.cancelledBy))
              : g.cancelledBy(who(a.cancelledBy))
          }
          action={
            isClient && requestStatus === "on_hold" ? (
              <ActionButton endpoint={`/api/v1/requests/${a.requestId}/reopen`} label={t.request.findAnother} redirectTo={`/uzklausos/${a.requestId}`} />
            ) : undefined
          }
        >
          {a.cancelledAt && g.when(formatDateTime(a.cancelledAt, locale))}
          {a.cancelReason && g.reason(a.cancelReason)}
          {a.status === "ended" && g.historyKept}
        </Alert>
      )}

      {a.status === "completed" && <Alert tone="success" title={g.completedTitle}>{g.completedText}</Alert>}

      {next && a.status === "active" && (
        <Card className="border-brand-300 ring-1 ring-brand-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{a.frequency ? g.nextVisitLabel : g.jobLabel}</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-2 text-xl font-bold">
              <CalendarClock className="size-6 text-brand-600" aria-hidden />
              {formatDateTime(next.scheduledAt, locale)}
            </p>
            <VisitStatusBadge status={next.status} />
          </div>
          {next.status === "done" && (
            <p className="mt-2 text-sm">
              {isClient ? g.doneQuestion : g.waitingClient}
            </p>
          )}
          {next.status === "problem" && next.problemNote && (
            <Alert tone="error" className="mt-3" title={g.clientNote}>
              {next.problemNote}
            </Alert>
          )}
          {next.status === "scheduled" && new Date(next.scheduledAt).getTime() < now && !isClient && (
            <p className="mt-2 text-sm text-sun-700">{g.timeCame}</p>
          )}
          <VisitActions a={a} v={next} t={t} />
        </Card>
      )}

      <Card>
        <h2 className="text-lg font-bold">{g.terms}</h2>
        <dl className="mt-2 divide-y divide-line">
          <DefinitionRow label={a.perVisit ? g.pricePerVisit : g.priceFinal}>
            <span className="text-2xl font-extrabold">{formatPrice(a.priceCents, locale)}</span>
          </DefinitionRow>
          <DefinitionRow label={a.frequency ? g.firstVisit : g.start}>{formatDateTime(a.startAt, locale)}</DefinitionRow>
          {a.frequency && (
            <DefinitionRow label={g.frequency}>
              <span className="inline-flex items-center gap-1.5">
                <Repeat className="size-4 text-brand-600" aria-hidden />
                {frequencyLabel(a.frequency, locale)}
                {a.seriesEnd ? `, ${t.request.until(midSentence(formatDateKey(a.seriesEnd, locale), locale))}` : t.request.noEnd}
              </span>
            </DefinitionRow>
          )}
          <DefinitionRow label={g.included}>{a.included}</DefinitionRow>
          {describeDetails(a.category, a.details, locale).length > 0 && (
            <DefinitionRow label={g.scope}>{describeDetails(a.category, a.details, locale).join(" · ")}</DefinitionRow>
          )}
          {a.description && (
            <DefinitionRow label={g.description}>
              <span className="whitespace-pre-line font-normal">{a.description}</span>
            </DefinitionRow>
          )}
          <DefinitionRow label={g.payment}>{g.paymentText(a.perVisit)}</DefinitionRow>
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
              <p className="text-sm text-muted">{businessFormLabel(a.provider.businessForm, locale)}</p>
              <ContactLinks phone={a.provider.phone} email={a.provider.email} deletedText={g.deletedContact} />
            </div>
          ) : (
            <div className="mt-2 space-y-1.5">
              <p className="inline-flex items-center gap-1.5 font-semibold">
                <User className="size-4 text-brand-600" aria-hidden /> {a.client.name}
              </p>
              <ContactLinks phone={a.client.phone} email={a.client.email} deletedText={g.deletedContact} />
            </div>
          )}
        </Card>
        <Card>
          <h2 className="text-lg font-bold">{g.location}</h2>
          <p className="mt-2 font-semibold">{a.location.address}</p>
          <p className="text-sm text-muted">
            {a.locality}, {a.municipalityLabel}
          </p>
          <a href={mapsLink(a.location)} target="_blank" rel="noopener" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
            <Navigation className="size-4" aria-hidden /> {t.request.openMap}
          </a>
        </Card>
      </div>

      {a.frequency && (later.length > 0 || history.length > 0) && (
        <Card>
          {later.length > 0 && (
            <>
              <h2 className="text-lg font-bold">{g.laterVisits}</h2>
              <ul className="mt-1 divide-y divide-line">
                {later.slice(0, 4).map((v) => (
                  <li key={v.id}>
                    <VisitRow v={v} t={t} locale={locale} />
                    <VisitActions a={a} v={v} t={t} />
                  </li>
                ))}
              </ul>
              {later.length > 4 && <p className="mt-2 text-sm text-muted">{g.moreVisits(later.length - 4)}</p>}
            </>
          )}
          {history.length > 0 && (
            <>
              <h2 className={later.length ? "mt-6 text-lg font-bold" : "text-lg font-bold"}>{g.history}</h2>
              <ul className="mt-1 divide-y divide-line">
                {history.map((v) => (
                  <VisitRow key={v.id} v={v} t={t} locale={locale} />
                ))}
              </ul>
            </>
          )}
        </Card>
      )}

      {!a.frequency && history.length > 0 && a.status !== "active" && (
        <Card>
          <SectionTitle>{g.history}</SectionTitle>
          <ul className="divide-y divide-line">
            {history.map((v) => (
              <VisitRow key={v.id} v={v} t={t} locale={locale} />
            ))}
          </ul>
        </Card>
      )}

      {a.status === "active" && (
        <div className="flex justify-end">
          <ActionButton
            endpoint={`/api/v1/agreements/${a.id}/cancel`}
            label={a.frequency ? g.endSeries : g.cancelAgreement}
            variant="danger"
            reasonLabel={g.reasonOptional}
            confirm={
              a.frequency
                ? g.endSeriesConfirm
                : g.cancelConfirm(isClient ? g.providerWord : g.clientWord)
            }
          />
        </div>
      )}
    </div>
  );
}

function ContactLinks({ phone, email, deletedText }: { phone: string | null; email: string; deletedText: string }) {
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
        <span className="text-muted">{deletedText}</span>
      )}
    </div>
  );
}
