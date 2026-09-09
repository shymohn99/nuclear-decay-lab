import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About the models | Phenomena",
  description: "Principles, equations, assumptions, sources, and known limits for the Phenomena Nuclear Collection.",
};

export default function AboutLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
