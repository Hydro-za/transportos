import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Transport OS",
    short_name: "Transport OS",
    description: "Fleet, freight, finance and dispatch management.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f5f6f8",
    theme_color: "#17243b",
    icons: [
      { src: "/transport-os-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/transport-os-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }
    ]
  };
}
