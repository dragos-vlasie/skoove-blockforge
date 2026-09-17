import { notFound, redirect } from "next/navigation";
import CmsClient from "../CmsClient";
import { getCmsActor, listCmsWorkspaces } from "../../../src/lib/cms/access";

export default async function ClientCmsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ site?: string }>;
}) {
  const actor = await getCmsActor();
  if (!actor) redirect("/cms?error=session");

  const [{ tenantId }, { site }] = await Promise.all([params, searchParams]);
  const workspaces = await listCmsWorkspaces(actor);
  const tenantWorkspaces = workspaces.filter((workspace) => workspace.tenantId === tenantId);
  const workspace = tenantWorkspaces.find((candidate) => candidate.siteId === site)
    || tenantWorkspaces.find((candidate) => candidate.siteId === "main")
    || tenantWorkspaces[0];

  if (!workspace) notFound();
  return <CmsClient workspace={workspace} workspaces={workspaces} />;
}
