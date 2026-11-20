import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getRequestView } from "@/server/services/requests";
import { AppError } from "@/server/errors";
import { requirePageActor } from "@/lib/require";
import { RequestWizard } from "@/components/wizard/request-wizard";
import { fromRequest } from "@/components/wizard/state";
import { PageHeader } from "@/components/ui";
import type { RequestView } from "@/shared/types";

export const metadata: Metadata = { title: "Redaguoti užklausą" };

export default async function EditRequestPage(props: PageProps<"/uzklausos/[id]/redaguoti">) {
  const { id } = await props.params;
  const actor = await requirePageActor(`/uzklausos/${id}/redaguoti`);
  let view: RequestView;
  try {
    view = await getRequestView(actor, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  if (view.viewer !== "owner" || view.status !== "open") redirect(`/uzklausos/${id}`);
  return (
    <div>
      <div className="mx-auto max-w-2xl">
        <PageHeader back={{ href: `/uzklausos/${id}`, label: "Atgal į užklausą" }} title="Redaguoti užklausą" />
      </div>
      <RequestWizard
        mode="edit"
        requestId={id}
        initial={fromRequest(view)}
        existingPhotos={view.photos}
        user={{ name: actor.name, phone: actor.phone }}
        hasOffers={view.offers.some((o) => o.status === "active")}
      />
    </div>
  );
}
