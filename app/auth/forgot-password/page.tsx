import type { Metadata } from "next";
import ForgotPasswordClient from "../../../src/cms/auth/ForgotPasswordClient";

export const metadata: Metadata = {
  title: "Reset your BlockForge password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.CMS_SUPABASE_URL || "";
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60 sm:p-10">
        <div className="mb-8">
          <span className="mb-5 inline-flex size-11 items-center justify-center rounded-xl bg-violet-600 text-lg font-black text-white">
            B
          </span>
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-violet-600">Client access</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Reset your password</h1>
          <p className="mt-3 leading-7 text-slate-600">
            We’ll email you a secure link to choose a new password.
          </p>
        </div>

        {supabaseUrl && publishableKey ? (
          <ForgotPasswordClient publishableKey={publishableKey} supabaseUrl={supabaseUrl} />
        ) : (
          <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            Client sign-in is not configured. Contact your BlockForge manager.
          </p>
        )}
      </section>
    </main>
  );
}
