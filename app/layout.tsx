import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Decay Lab | 原子核崩壊シミュレーター",
  description:
    "原子核が確率的に崩壊する様子と指数関数的な減衰曲線を、粒子アニメーションで観察できるインタラクティブ・シミュレーター。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Decay Lab | 原子核崩壊シミュレーター",
    description:
      "見えない確率を、粒子の光で観測する。核崩壊のモンテカルロ・シミュレーション。",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#050912",
  colorScheme: "dark",
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
