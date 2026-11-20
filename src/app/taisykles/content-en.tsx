// English translation of the terms of use. The Lithuanian version prevails.
import Link from "next/link";
import { OPERATOR, operatorLine } from "@/shared/operator";
import { Alert, Card, PageHeader } from "@/components/ui";

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-6 text-lg font-bold first:mt-0">{children}</h2>;
}

export function TermsEn() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Terms of use" subtitle={`Updated ${OPERATOR.updatedEn}`} />
      {!OPERATOR.ready && (
        <Alert tone="warning" title="Draft">
          This text is still being finalised. It should be reviewed by a lawyer before the platform is opened to real users.
        </Alert>
      )}
      <Alert tone="info">This is a translation for convenience. In case of any discrepancy, the Lithuanian version prevails.</Alert>

      <Card className="space-y-3 leading-relaxed text-stone-800 [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-2">
        <H>1. What Kviki is</H>
        <p>
          Kviki is an online platform where clients describe yard and farm jobs and service providers (companies and self-employed
          people) offer their price and time. The platform is operated by {operatorLine("en")}, email {OPERATOR.email}.
        </p>
        <p>
          <strong>Kviki is an intermediary.</strong> The contract for the job is made directly between the client and the provider.
          Kviki is not a party to that contract and is not responsible for how the work is done, its quality, deadlines or any
          damage resulting from it.
        </p>

        <H>2. Account</H>
        <ul>
          <li>The platform may be used by people aged 18 or over.</li>
          <li>Provide accurate details and keep your password safe. You are responsible for actions taken in your account.</li>
          <li>One account can be used both to order jobs and to do them.</li>
          <li>You can delete your account at any time in your account settings.</li>
        </ul>

        <H>3. Requests and offers</H>
        <ul>
          <li>The client describes the job, place and time honestly. Photos must not contain other people's personal data without their consent.</li>
          <li>The price in a provider's offer is the final price the client pays for the stated scope (for a recurring job – for one visit).</li>
          <li>Until the client accepts the offer, the provider may change or withdraw it. If the client changes the request, the provider must reconfirm the price.</li>
          <li>Once the client accepts an offer, both parties undertake to do the job on the agreed terms or to cancel it in good time through the platform.</li>
        </ul>

        <H>4. For providers</H>
        <ul>
          <li>You provide services lawfully: as a company or holding an individual activity certificate, business licence or another appropriate basis.</li>
          <li>You are responsible for taxes, work safety, any required permits and, where needed, liability insurance.</li>
          <li>The “Verified” badge is shown only when Kviki has actually checked the provider's details.</li>
        </ul>

        <H>5. Prices and payment</H>
        <p>
          Using Kviki is currently free of charge. The client pays for the job directly to the provider in the way they agree on.
          Kviki does not collect payments and is not responsible for them.
        </p>

        <H>6. Prohibited</H>
        <ul>
          <li>posting false, offensive or unlawful information;</li>
          <li>using other people's data without their permission;</li>
          <li>sending spam or advertising, or making fake offers;</li>
          <li>trying to bypass the platform's security or to obtain other users' data.</li>
        </ul>
        <p>If the terms are breached, Kviki may remove content, restrict or delete the account.</p>

        <H>7. Liability</H>
        <p>
          Kviki does its best to keep the platform running without interruption but does not guarantee that it will always be
          available. Kviki is not liable for the accuracy of information provided by users or for the consequences of transactions
          between users, except where liability cannot be limited by law.
        </p>

        <H>8. Personal data</H>
        <p>
          How we handle data is described in the{" "}
          <Link href="/privatumas" className="font-semibold text-brand-700 underline">
            privacy policy
          </Link>
          .
        </p>

        <H>9. Changes to the terms and disputes</H>
        <p>
          We may update these terms; the new version is published on this page. Lithuanian law applies. We try to resolve disputes
          by negotiation ({OPERATOR.email}). Consumers may also contact the State Consumer Rights Protection Authority of Lithuania
          (vvtat.lt).
        </p>
      </Card>
    </div>
  );
}
