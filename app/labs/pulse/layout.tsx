import { createLabMetadata } from "../../lib/site";

export const metadata = createLabMetadata(
  "pulse",
  "Pulse Lab",
  "Accumulate reproducible synthetic radiation events and watch spectrum-like structure emerge.",
);

export default function PulseLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
