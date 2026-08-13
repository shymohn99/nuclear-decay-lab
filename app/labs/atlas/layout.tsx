import { createLabMetadata } from "../../lib/site";

export const metadata = createLabMetadata(
  "atlas",
  "Nuclide Atlas",
  "Search a nuclide, inspect a representative decay branch, and move into related Phenomena Labs.",
);

export default function AtlasLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
