// English translation of the privacy policy. The Lithuanian version prevails.
import Link from "next/link";
import { OPERATOR, operatorLine } from "@/shared/operator";
import { Alert, Card, PageHeader } from "@/components/ui";

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-6 text-lg font-bold first:mt-0">{children}</h2>;
}

export function PrivacyEn() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Privacy policy" subtitle={`Updated ${OPERATOR.updatedEn}`} />
      {!OPERATOR.ready && (
        <Alert tone="warning" title="Draft">
          This text is still being finalised. It should be reviewed by a lawyer before the platform is opened to real users.
        </Alert>
      )}
      <Alert tone="info">This is a translation for convenience. In case of any discrepancy, the Lithuanian version prevails.</Alert>

      <Card className="space-y-3 leading-relaxed text-stone-800 [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-2">
        <p className="!mt-0">
          <strong>In short:</strong> we collect only as much data as is needed for a client and a provider to agree on a job. Until
          a provider is chosen, providers see only the job description, photos, municipality and village. Only the chosen provider
          sees the exact address and phone number. We do not use advertising or tracking cookies.
        </p>

        <H>1. Who processes your data</H>
        <p>
          Data controller: <strong>{operatorLine("en")}</strong>. For questions about your data, write to{" "}
          <strong>{OPERATOR.email}</strong>.
        </p>

        <H>2. What data we collect and why</H>
        <ul>
          <li>
            <strong>Account:</strong> name, email, password (only a cryptographic hash is stored) and phone number if you provide it.
            Purpose – creating your account and logging in. Legal basis – performance of a contract (GDPR Art. 6(1)(b)).
          </li>
          <li>
            <strong>Requests:</strong> type of job, description, scope, photos, municipality, village, preferred time, exact address,
            contact phone and, if you allow it, location coordinates. Purpose – finding a provider and making a deal. Legal basis –
            performance of a contract.
          </li>
          <li>
            <strong>Provider profile:</strong> name or company name, business form, company code (optional), phone, services and
            municipalities. Legal basis – performance of a contract.
          </li>
          <li>
            <strong>Offers, orders and visits:</strong> prices, times, statuses and cancellation reasons. Legal basis – performance
            of a contract and our legitimate interest in keeping a record of deals in case of disputes (GDPR Art. 6(1)(f)).
          </li>
          <li>
            <strong>Technical data:</strong> server logs record the IP address and request time, as well as the number of login
            attempts. Purpose – security and abuse prevention. Legal basis – legitimate interest.
          </li>
          <li>
            <strong>Location detection</strong> is used only when you press “Use my location” and allow it in your browser. Legal
            basis – your consent, which you can withdraw at any time in your browser settings.
          </li>
        </ul>

        <H>3. Who sees your data</H>
        <ul>
          <li>Before you choose, other providers see only the job description, photos, municipality and village – not your name, address or phone.</li>
          <li>The provider you choose sees your name, phone, email and exact address.</li>
          <li>A client who chooses a provider sees the provider's name or company name, business form, phone and email.</li>
          <li>Only the author of a request sees the prices offered; providers do not see each other's prices.</li>
          <li>
            Service providers that help run the website: the server hosting provider (Hostinger); an email delivery service (if
            email notifications are enabled); “OpenStreetMap Nominatim” – only coordinates, when you press “Use my location”.
          </li>
          <li>We do not sell data and do not use it for advertising.</li>
        </ul>

        <H>4. How long we keep data</H>
        <ul>
          <li>Account, request and order data – for as long as you have an account.</li>
          <li>
            When you delete your account, your name, contacts, addresses, descriptions and photos are removed immediately. Only an
            anonymised order history (type of job, price, dates) needed by the other party remains.
          </li>
          <li>Backups are kept for up to 14 days and then deleted automatically.</li>
          <li>Inactive requests are closed automatically: “As soon as possible” ones after 14 days, others when the time set has passed or after 30 days.</li>
        </ul>

        <H>5. Your rights</H>
        <p>
          You have the right to access your data, to correct it, to have it erased, to restrict its processing, to object to
          processing and to receive it in a portable format. You can change your name and phone in your{" "}
          <Link href="/paskyra" className="font-semibold text-brand-700 underline">
            account settings
          </Link>
          , where you can also delete your account. For other requests, write to {OPERATOR.email} – we will reply within 30 days. If
          you believe your rights have been infringed, you may contact the State Data Protection Inspectorate of Lithuania
          (vdai.lrv.lt).
        </p>

        <H>6. Cookies and browser storage</H>
        <p>
          We use one strictly necessary cookie, <code>kviki_session</code>, to keep you logged in (valid for up to 60 days or until
          you log out), and the <code>kviki_lang</code> cookie to remember your language. A draft of a request you have started is
          kept only in your browser until you publish it. We do not use analytics or advertising cookies, so there is no consent banner.
        </p>

        <H>7. Security</H>
        <p>
          The connection is encrypted (HTTPS), passwords are stored only as a cryptographic hash, location (GPS) data is removed from
          photos, and access to private data is checked on the server.
        </p>
      </Card>
      <p className="text-sm text-muted">
        See also the{" "}
        <Link href="/taisykles" className="font-semibold text-brand-700 underline">
          terms of use
        </Link>
        .
      </p>
    </div>
  );
}
