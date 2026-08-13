"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const currentDecayRoute = "/labs/decay";

export default function LegacyDecayRoute() {
  const router = useRouter();

  useEffect(() => {
    const target = `${currentDecayRoute}${window.location.search}${window.location.hash}`;
    router.replace(target);
  }, [router]);

  return (
    <main className="route-migration" aria-labelledby="migration-title">
      <p className="eyebrow">PHENOMENA / MIGRATION</p>
      <h1 id="migration-title">Decay Lab has moved.</h1>
      <p>Redirecting to the Phenomena Decay Lab. URL conditions are retained; if redirection is unavailable, use the link below.</p>
      <Link href={currentDecayRoute}>Open Decay Lab →</Link>
    </main>
  );
}
