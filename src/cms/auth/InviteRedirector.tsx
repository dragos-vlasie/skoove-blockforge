"use client";

import { useEffect } from "react";

export default function InviteRedirector() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const type = params.get("type");

    if (
      params.has("access_token") &&
      params.has("refresh_token") &&
      (type === "invite" || type === "recovery")
    ) {
      window.location.replace(`/auth/setup-password/${window.location.hash}`);
    }
  }, []);

  return null;
}
