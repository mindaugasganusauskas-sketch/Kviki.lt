import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kviki – vietinė pagalba kiemo ir ūkio darbams",
    short_name: "Kviki",
    description: "Aprašykite darbą – vietos teikėjai pasiūlys kainą ir laiką.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8f4",
    theme_color: "#386e2c",
    lang: "lt",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
