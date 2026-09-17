import { createClient, type User } from "@supabase/supabase-js";
import { ClientProvisioningError } from "./types";

type ProvisioningEnv = Record<string, string | undefined>;

const readSupabaseAdminConfig = (env: ProvisioningEnv = process.env) => {
  const url = env.CMS_SUPABASE_URL || env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "";
  const secretKey =
    env.CMS_SUPABASE_SECRET_KEY ||
    env.SUPABASE_SECRET_KEY ||
    env.CMS_SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY ||
    "";
  const bucket = env.CMS_SUPABASE_STORAGE_BUCKET || env.SUPABASE_STORAGE_BUCKET || "cms-media";

  if (!url || !secretKey) {
    throw new ClientProvisioningError(
      "Supabase provisioning requires CMS_SUPABASE_URL and CMS_SUPABASE_SECRET_KEY.",
      502,
    );
  }

  return { url, secretKey, bucket };
};

const createSupabaseAdminClient = (env: ProvisioningEnv = process.env) => {
  const config = readSupabaseAdminConfig(env);
  return {
    config,
    client: createClient(config.url, config.secretKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    }),
  };
};

const findUserByEmail = async (
  email: string,
  env: ProvisioningEnv = process.env,
): Promise<User | null> => {
  const { client } = createSupabaseAdminClient(env);

  for (let page = 1; page <= 50; page += 1) {
    const response = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (response.error) throw new ClientProvisioningError(`Unable to look up the user account: ${response.error.message}`, 502);
    const users = response.data.users as User[];
    const user = users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (users.length < 200) return null;
  }

  throw new ClientProvisioningError("Unable to finish searching Supabase Auth users.", 502);
};

const inviteClientMember = async (
  email: string,
  env: ProvisioningEnv = process.env,
) => {
  const { client } = createSupabaseAdminClient(env);
  const redirectBase = String(env.CMS_APP_URL || env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
  const { data, error } = await client.auth.admin.inviteUserByEmail(email, {
    ...(redirectBase ? { redirectTo: `${redirectBase}/auth/setup-password/` } : {}),
  });

  if (data.user && !error) return { user: data.user, invited: true };

  const existingUser = await findUserByEmail(email, env);
  if (existingUser) return { user: existingUser, invited: false };

  throw new ClientProvisioningError(
    `Unable to invite ${email}${error?.message ? `: ${error.message}` : "."}`,
    502,
  );
};

export const inviteClientOwner = inviteClientMember;
export const inviteClientDeveloper = inviteClientMember;

export const ensureClientMediaNamespace = async (
  tenantId: string,
  siteId: string,
  env: ProvisioningEnv = process.env,
) => {
  const { client, config } = createSupabaseAdminClient(env);
  const { data: buckets, error: listError } = await client.storage.listBuckets();
  if (listError) {
    throw new ClientProvisioningError(`Unable to inspect Supabase Storage: ${listError.message}`, 502);
  }

  const existingBucket = buckets.find((bucket) => bucket.name === config.bucket);
  if (!existingBucket) {
    const { error } = await client.storage.createBucket(config.bucket, {
      public: true,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      fileSizeLimit: 10 * 1024 * 1024,
    });
    if (error) throw new ClientProvisioningError(`Unable to create the media bucket: ${error.message}`, 502);
  } else if (!existingBucket.public) {
    throw new ClientProvisioningError(
      `Supabase Storage bucket "${config.bucket}" must be public before provisioning client websites.`,
      502,
    );
  }

  // Supabase Storage folders are virtual. All media operations scope object keys
  // to this tenant/site prefix, so no marker object is necessary.
  return { bucket: config.bucket, prefix: `${tenantId}/${siteId}` };
};

export const assertSupabaseProvisioningConfigured = (env: ProvisioningEnv = process.env) => {
  readSupabaseAdminConfig(env);
};
