"use client";

import { createBrowserClient } from "@supabase/ssr";
import { FormEvent, useEffect, useMemo, useState } from "react";

type PasswordSetupClientProps = {
  supabaseUrl: string;
  publishableKey: string;
};

type SetupState = "checking" | "ready" | "invalid" | "saving" | "complete";

export default function PasswordSetupClient({
  supabaseUrl,
  publishableKey,
}: PasswordSetupClientProps) {
  const supabase = useMemo(
    () => createBrowserClient(supabaseUrl, publishableKey),
    [publishableKey, supabaseUrl],
  );
  const [state, setState] = useState<SetupState>("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const prepareSession = async () => {
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = fragment.get("access_token");
      const refreshToken = fragment.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        if (sessionError) {
          if (active) setState("invalid");
          return;
        }
      }

      const { data, error: userError } = await supabase.auth.getUser();
      if (!active) return;
      setState(!userError && data.user ? "ready" : "invalid");
    };

    void prepareSession();
    return () => {
      active = false;
    };
  }, [supabase]);

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password.length < 10) {
      setError("Use at least 10 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setState("saving");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setState("ready");
      return;
    }

    setState("complete");
    window.location.assign("/cms");
  };

  if (state === "checking") {
    return <p className="text-sm text-slate-600">Checking your invitation…</p>;
  }

  if (state === "invalid") {
    return (
      <div className="space-y-4">
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          This invitation link is invalid or has expired. Ask your BlockForge manager to send a new invitation.
        </p>
        <a className="inline-flex font-semibold text-violet-700 hover:text-violet-900" href="/cms">
          Return to sign in
        </a>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={submitPassword}>
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-800" htmlFor="password">
          Create password
        </label>
        <input
          autoComplete="new-password"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
          disabled={state !== "ready"}
          id="password"
          minLength={10}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
        <p className="mt-2 text-xs text-slate-500">Use at least 10 characters.</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-800" htmlFor="password-confirmation">
          Confirm password
        </label>
        <input
          autoComplete="new-password"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
          disabled={state !== "ready"}
          id="password-confirmation"
          minLength={10}
          onChange={(event) => setConfirmation(event.target.value)}
          required
          type="password"
          value={confirmation}
        />
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
          {error}
        </p>
      ) : null}

      <button
        className="w-full rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-200 disabled:cursor-wait disabled:opacity-60"
        disabled={state !== "ready"}
        type="submit"
      >
        {state === "saving" ? "Saving…" : state === "complete" ? "Opening CMS…" : "Create password"}
      </button>
    </form>
  );
}
