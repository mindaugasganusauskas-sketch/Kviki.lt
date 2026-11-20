import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActor } from "@/server/auth/session";
import { safeNext } from "@/lib/safe-next";
import { AuthPageForm } from "./auth-page-form";

export const metadata: Metadata = { title: "Prisijungti" };

export default async function LoginPage(props: PageProps<"/prisijungti">) {
  const sp = await props.searchParams;
  const next = safeNext(sp.next);
  if (await getActor()) redirect(next ?? "/");
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-2xl font-bold">Prisijunkite</h1>
      <p className="mb-6 text-muted">Viena paskyra tinka ir užsakyti darbus, ir juos atlikti.</p>
      <AuthPageForm tab="login" next={next} />
      <p className="mt-4 text-center text-sm text-muted">
        Pamiršote slaptažodį? Parašykite mums{" "}
        <a href="mailto:info@kviki.lt" className="font-semibold text-brand-700 underline">
          info@kviki.lt
        </a>
        .
      </p>
    </div>
  );
}
