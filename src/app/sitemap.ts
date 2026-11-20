import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return ["/", "/nauja-uzklausa", "/kaip-tai-veikia", "/registracija", "/taisykles", "/privatumas"].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
