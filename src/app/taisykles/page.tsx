import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { TermsEn } from "./content-en";
import { TermsLt } from "./content-lt";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.titles.terms };
}

export default async function Page() {
  const { locale } = await getI18n();
  return locale === "en" ? <TermsEn /> : <TermsLt />;
}
