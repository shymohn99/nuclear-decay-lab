import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteBasePath =
  process.env.GITHUB_PAGES === "true" ? "/nuclear-decay-lab" : "";
const siteOrigin =
  process.env.GITHUB_PAGES === "true"
    ? "https://shymohn99.github.io"
    : "https://nuclear-decay-lab-shymohn.shymohn.chatgpt.site";
const title = "nuclear-decay-lab | Monte Carlo Nuclear Decay Simulator";
const description =
  "Explore radioactive decay, major decay chains, nuclide relationships, and detector response in an interactive Monte Carlo laboratory.";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title,
  description,
  alternates: {
    canonical: `${siteBasePath}/`,
  },
  authors: [
    {
      name: "Shymohn",
      url: "https://shymohn99.github.io/portfolio/",
    },
  ],
  creator: "Shymohn",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: `${siteBasePath}/favicon.svg`,
    shortcut: `${siteBasePath}/favicon.svg`,
  },
  openGraph: {
    title,
    description,
    type: "website",
    url: `${siteBasePath}/`,
    siteName: "nuclear-decay-lab",
    locale: "ja_JP",
    images: [
      {
        url: `${siteBasePath}/og.png`,
        width: 1200,
        height: 630,
        alt: "nuclear-decay-lab — Monte Carlo nuclear decay simulator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [`${siteBasePath}/og.png`],
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "nuclear-decay-lab",
  url: `${siteOrigin}${siteBasePath}/`,
  description,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any",
  isAccessibleForFree: true,
  image: `${siteOrigin}${siteBasePath}/og.png`,
  inLanguage: ["ja", "en"],
  creator: {
    "@type": "Person",
    name: "Shymohn",
    url: "https://shymohn99.github.io/portfolio/",
    sameAs: [
      "https://github.com/shymohn99",
      "https://x.com/Shymohn",
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#f1efe8",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <script
          id="nuclear-decay-lab-structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
