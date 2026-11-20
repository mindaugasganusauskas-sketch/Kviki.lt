import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/mano-uzklausos", "/mano-darbai", "/uzklausos/", "/susitarimai/", "/darbai-salia", "/pranesimai", "/paskyra"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
