import { createLabMetadata } from "../../lib/site";

export const metadata = createLabMetadata(
  "decay",
  "Decay Lab",
  "Observe radioactive decay with a Monte Carlo simulator, theory curve, and inspectable teaching models.",
);

export default function DecayLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
