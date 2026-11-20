import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActor } from "@/server/auth/session";
import { AuthPageForm } from "../prisijungti/auth-page-form";

export const metadata: Metadata = { title: "Registracija" };

export default async function RegisterPage(props: PageProps<"/registracija">) {
  const sp = await props.searchParams;
  const provider = sp.teikejas === "1";
  if (await getActor()) redirect(provider ? "/paskyra/teikejas" : "/");
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-2xl font-bold">{provider ? "Tapkite teikėju" : "Sukurkite paskyrą"}</h1>
      <p className="mb-6 text-muted">
        {provider
          ? "Pirmiausia sukurkite paskyrą. Kitame žingsnyje pasirinksite veiklos formą, paslaugas ir savivaldybes."
          : "Viena paskyra tinka ir užsakyti darbus, ir juos atlikti."}
      </p>
      <AuthPageForm tab="register" next={null} provider={provider} />
    </div>
  );
}
