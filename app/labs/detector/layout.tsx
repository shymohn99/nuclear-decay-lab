import { createLabMetadata } from "../../lib/site";

export const metadata = createLabMetadata(
  "detector",
  "Detector Lab",
  "Compare relative educational detector response while changing source, distance, shielding, and time.",
);

export default function DetectorLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
