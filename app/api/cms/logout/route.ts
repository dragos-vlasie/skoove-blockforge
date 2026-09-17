import { CMS_SESSION_COOKIE } from "../../../../src/lib/cms/auth";
import { signOutCmsUser } from "../../../../src/lib/cms/supabaseAuth";

export async function POST(request: Request) {
  await signOutCmsUser();
  const response = Response.redirect(new URL("/cms", request.url), 303);
  response.headers.set("set-cookie", `${CMS_SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
  return response;
}
export const GET = POST;
