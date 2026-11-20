import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { PrivacyEn } from "./content-en";
import { PrivacyLt } from "./content-lt";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.titles.privacy };
}

export default async function Page() {
  const { locale } = await getI18n();
  return locale === "en" ? <PrivacyEn /> : <PrivacyLt />;
}
