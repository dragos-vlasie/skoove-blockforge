import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createCmsSupabaseServerClient } from "../../../src/lib/cms/supabaseAuth";

const safeNextPath = (value: string | null) =>
  value?.startsWith("/") && !value.startsWith("//") ? value : "/auth/setup-password/";

export async function GET(request: NextRequest) {
  const supabase = await createCmsSupabaseServerClient();
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  let error: Error | null = null;

  if (!supabase) {
    error = new Error("Supabase Auth is not configured.");
  } else if (tokenHash && type) {
    const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    error = result.error;
  } else if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
  } else {
    error = new Error("The invitation is missing its authentication token.");
  }

  const destination = new URL(error ? "/auth/setup-password/?error=invalid" : next, request.url);
  return NextResponse.redirect(destination);
}
