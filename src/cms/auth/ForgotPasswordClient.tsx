"use client";

import { createBrowserClient } from "@supabase/ssr";
import { FormEvent, useMemo, useState } from "react";

type ForgotPasswordClientProps = {
  supabaseUrl: string;
  publishableKey: string;
};

export default function ForgotPasswordClient({
  supabaseUrl,
  publishableKey,
}: ForgotPasswordClientProps) {
  const supabase = useMemo(
    () => createBrowserClient(supabaseUrl, publishableKey),
    [publishableKey, supabaseUrl],
  );
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/setup-password/`,
    });

    setSubmitting(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="space-y-4">
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
          Check your inbox. If that email has a BlockForge account, you’ll receive a secure link to create a new password.
        </p>
        <a className="inline-flex font-semibold text-violet-700 hover:text-violet-900" href="/cms">
          Return to sign in
        </a>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-800" htmlFor="email">
          Email address
        </label>
        <input
          autoComplete="email"
          autoFocus
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
          id="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
          {error}
        </p>
      ) : null}

      <button
        className="w-full rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-200 disabled:cursor-wait disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Sending…" : "Send password link"}
      </button>
      <a className="block text-center text-sm font-semibold text-violet-700 hover:text-violet-900" href="/cms">
        Return to sign in
      </a>
    </form>
  );
}
