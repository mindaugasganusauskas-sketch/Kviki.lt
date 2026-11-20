// Pranešimų tekstai abiem kalbomis. Pranešimas saugo tipą ir parametrus,
// o tekstas sudaromas rodant – gavėjo kalba.
import { requestHeadline } from "./categories";
import { formatDateTime, formatPriceLabel } from "./format";
import type { Locale } from "./locale";
import { municipalityLabel } from "./municipalities";

export interface NotificationParams {
  category?: string;
  details?: Record<string, unknown>;
  locality?: string;
  municipality?: string;
  priceCents?: number;
  perVisit?: boolean;
  startAt?: string;
  scheduledAt?: string;
  providerName?: string;
  role?: "client" | "provider";
  reason?: string | null;
  note?: string;
  audience?: "client" | "provider";
}

export function renderNotification(type: string, p: NotificationParams, locale: Locale): { title: string; body: string } {
  const en = locale === "en";
  const h = requestHeadline(p.category ?? "other", p.details ?? {}, locale);
  const price = p.priceCents !== undefined ? formatPriceLabel(p.priceCents, p.perVisit ?? false, locale) : "";
  const who = p.role === "client" ? (en ? "The client" : "Klientas") : en ? "The provider" : "Teikėjas";
  const reason = p.reason ? (en ? `Reason: ${p.reason}` : `Priežastis: ${p.reason}`) : "";
  switch (type) {
    case "new_job":
      return {
        title: en ? `New job nearby: ${h}` : `Naujas darbas šalia: ${h}`,
        body: `${p.locality ?? ""}, ${municipalityLabel(p.municipality ?? "")}`,
      };
    case "new_offer":
      return { title: en ? `New offer: ${price}` : `Naujas pasiūlymas: ${price}`, body: `${p.providerName ?? ""} – ${h}` };
    case "offer_updated":
      return { title: en ? `Offer updated: ${price}` : `Pasiūlymas atnaujintas: ${price}`, body: `${p.providerName ?? ""} – ${h}` };
    case "offer_withdrawn":
      return { title: en ? `${p.providerName} withdrew their offer` : `${p.providerName} atsiėmė pasiūlymą`, body: h };
    case "offer_accepted":
      return {
        title: en ? `Your offer was accepted: ${h}` : `Jūsų pasiūlymas priimtas: ${h}`,
        body: en
          ? `${price}, start ${formatDateTime(p.startAt ?? new Date(), locale)}. The address and contact are on the order card.`
          : `${price}, pradžia ${formatDateTime(p.startAt ?? new Date(), locale)}. Adresas ir kontaktai – užsakymo kortelėje.`,
      };
    case "request_closed":
      return {
        title: en ? `Request closed: ${h}` : `Užklausa baigėsi: ${h}`,
        body: en ? "The client chose another offer. Thank you for your offer." : "Klientas pasirinko kitą pasiūlymą. Ačiū, kad pasiūlėte.",
      };
    case "request_changed":
      return {
        title: en ? `The client changed the request: ${h}` : `Klientas pakeitė užklausą: ${h}`,
        body: en ? "Review the changes and reconfirm your price." : "Peržiūrėkite pakeitimus ir patvirtinkite savo kainą iš naujo.",
      };
    case "request_cancelled":
      return { title: en ? `The client cancelled the request: ${h}` : `Klientas atšaukė užklausą: ${h}`, body: "" };
    case "request_reopened":
      return {
        title: en ? `Request open again: ${h}` : `Užklausa vėl atvira: ${h}`,
        body: en
          ? "The client is looking for another provider. Reconfirm your offer if it is still valid."
          : "Klientas ieško kito teikėjo. Patvirtinkite savo pasiūlymą, jei jis vis dar galioja.",
      };
    case "request_expired":
      return {
        title: en ? `Request expired: ${h}` : `Užklausa nebegalioja: ${h}`,
        body:
          p.audience === "provider"
            ? ""
            : en
              ? "The time has passed or no deal was made for a long time. If you still need the job done, renew the request with a new time."
              : "Laikas praėjo arba ilgai nebuvo susitarta. Jei darbo vis dar reikia, atnaujinkite užklausą nauju laiku.",
      };
    case "agreement_cancelled":
      return { title: en ? `${who} cancelled the order: ${h}` : `${who} atšaukė užsakymą: ${h}`, body: reason };
    case "series_ended":
      return { title: en ? `${who} ended the upcoming visits: ${h}` : `${who} nutraukė būsimus vizitus: ${h}`, body: reason };
    case "visit_done":
      return {
        title: en ? `Job done: ${h}` : `Darbas atliktas: ${h}`,
        body: en
          ? "The provider marked the job as done. Confirm the result or report a problem."
          : "Teikėjas pažymėjo darbą atliktu. Patvirtinkite rezultatą arba pažymėkite problemą.",
      };
    case "visit_confirmed":
      return { title: en ? `The client confirmed the job: ${h}` : `Klientas patvirtino darbą: ${h}`, body: "" };
    case "visit_problem":
      return { title: en ? `The client reported a problem: ${h}` : `Klientas pažymėjo problemą: ${h}`, body: p.note ?? "" };
    case "visit_cancelled": {
      const when = formatDateTime(p.scheduledAt ?? new Date(), locale);
      return {
        title: en ? `${who} cancelled the visit on ${when}` : `${who} atšaukė vizitą ${when}`,
        body: en
          ? `${h}. Other visits stay scheduled.${reason ? ` ${reason}` : ""}`
          : `${h}. Kiti vizitai lieka suplanuoti.${reason ? ` ${reason}` : ""}`,
      };
    }
    default:
      return { title: h, body: "" };
  }
}
