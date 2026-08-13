import type { Metadata } from "next";

export const siteBasePath = process.env.GITHUB_PAGES === "true" ? "/nuclear-decay-lab" : "";
// Local previews omit the base path, but published metadata always identifies
// the repository's GitHub Pages origin rather than a template-hosting URL.
export const siteOrigin = "https://shymohn99.github.io";
export const socialImagePath = `${siteBasePath}/og-phenomena.png`;

export function createLabMetadata(slug: string, title: string, description: string): Metadata {
  const canonical = `${siteBasePath}/labs/${slug}/`;
  return {
    title: `${title} | Phenomena`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | Phenomena`,
      description,
      type: "website",
      url: canonical,
      siteName: "Phenomena",
      locale: "ja_JP",
      images: [{
        url: socialImagePath,
        width: 1731,
        height: 909,
        alt: "Phenomena Foundation v1 — Nuclear Collection",
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Phenomena`,
      description,
      images: [socialImagePath],
    },
  };
}
