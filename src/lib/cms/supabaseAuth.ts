import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type SupabaseAuthConfig = {
  url: string;
  key: string;
};

const readSupabaseAuthConfig = (): SupabaseAuthConfig | null => {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.CMS_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.CMS_SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.CMS_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";

  return url && key ? { url, key } : null;
};

export const isSupabaseCmsAuthConfigured = () => Boolean(readSupabaseAuthConfig());

export const createCmsSupabaseServerClient = async () => {
  const config = readSupabaseAuthConfig();
  if (!config) return null;

  const cookieStore = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. Route handlers and the
          // login/logout endpoints can, so session refresh still persists there.
        }
      },
    },
  });
};

export const getSupabaseCmsUser = async () => {
  const supabase = await createCmsSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
};

export const signInCmsUser = async (email: string, password: string) => {
  const supabase = await createCmsSupabaseServerClient();
  if (!supabase) return { user: null, error: new Error("Supabase Auth is not configured.") };

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { user: data.user, error };
};

export const signOutCmsUser = async () => {
  const supabase = await createCmsSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
};
