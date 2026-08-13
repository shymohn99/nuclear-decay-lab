import type { Metadata, Viewport } from "next";
import "./globals.css";
import { siteBasePath, siteOrigin, socialImagePath } from "./lib/site";
const title = "Phenomena | Foundation v1";
const description =
  "Phenomena Foundation v1: interactive, device-first laboratories for making invisible nuclear phenomena tangible.";

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
    siteName: "Phenomena",
    locale: "ja_JP",
    images: [
      {
        url: socialImagePath,
        width: 1731,
        height: 909,
        alt: "Phenomena Foundation v1 — Nuclear Collection",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [socialImagePath],
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
