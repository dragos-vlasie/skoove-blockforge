"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DeploymentStatusRefresher({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const timeout = window.setTimeout(() => router.refresh(), 8000);
    return () => window.clearTimeout(timeout);
  }, [active, router]);

  return null;
}
