import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActor } from "@/server/auth/session";
import { safeNext } from "@/lib/safe-next";
import { getI18n } from "@/i18n/server";
import { AuthPageForm } from "./auth-page-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.titles.login };
}

export default async function LoginPage(props: PageProps<"/prisijungti">) {
  const sp = await props.searchParams;
  const next = safeNext(sp.next);
  if (await getActor()) redirect(next ?? "/");
  const { t } = await getI18n();
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-2xl font-bold">{t.auth.loginTitle}</h1>
      <p className="mb-6 text-muted">{t.auth.loginSubtitle}</p>
      <AuthPageForm tab="login" next={next} />
      <p className="mt-4 text-center text-sm text-muted">
        {t.auth.forgot}{" "}
        <a href="mailto:info@kviki.lt" className="font-semibold text-brand-700 underline">
          info@kviki.lt
        </a>
        .
      </p>
    </div>
  );
}
