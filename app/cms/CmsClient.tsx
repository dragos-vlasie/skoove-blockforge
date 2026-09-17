"use client";

import App from "../../App";
import type { CmsWorkspace } from "../../src/lib/cms/workspaceTypes";

export default function CmsClient({
  workspace,
  workspaces,
}: {
  workspace: CmsWorkspace;
  workspaces: CmsWorkspace[];
}) {
  return <App workspace={workspace} workspaces={workspaces} />;
}
