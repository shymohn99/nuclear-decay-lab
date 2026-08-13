import { createLabMetadata } from "../lib/site";

// The legacy route is an alias, so its canonical preview always names its current destination.
export const metadata = createLabMetadata(
  "decay",
  "Decay Lab",
  "Decay Lab now lives in Phenomena. This migration route opens the current interactive laboratory.",
);

export default function LegacyDecayLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
