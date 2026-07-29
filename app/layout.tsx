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
  icons: {
    icon: `${siteBasePath}/favicon.svg`,
    shortcut: `${siteBasePath}/favicon.svg`,
  },
  openGraph: {
    title,
    description,
    type: "website",
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
      <body>{children}</body>
    </html>
  );
}
