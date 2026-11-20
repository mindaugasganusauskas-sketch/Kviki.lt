import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActor } from "@/server/auth/session";
import { AuthPageForm } from "./auth-page-form";

export const metadata: Metadata = { title: "Prisijungti" };

export default async function LoginPage(props: PageProps<"/prisijungti">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : null;
  if (await getActor()) redirect(next ?? "/");
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-2xl font-bold">Prisijunkite</h1>
      <p className="mb-6 text-muted">Viena paskyra tinka ir užsakyti darbus, ir juos atlikti.</p>
      <AuthPageForm tab="login" next={next} />
    </div>
  );
}
