import { authorizeCmsPlatformAdmin, cmsAccessErrorResponse } from "../../../../src/lib/cms/access";
import { provisionClient, type ClientProvisioningInput } from "../../../../src/lib/cms/provisioning/provisionClient";
import { ClientProvisioningError } from "../../../../src/lib/cms/provisioning/types";

export async function POST(request: Request) {
  try {
    await authorizeCmsPlatformAdmin(request);
    const input = await request.json() as ClientProvisioningInput;
    const result = await provisionClient(input);
    return Response.json({ ok: true, result }, { status: 201 });
  } catch (error) {
    if (error instanceof ClientProvisioningError) {
      return Response.json({ ok: false, error: error.message }, { status: error.status });
    }
    return cmsAccessErrorResponse(error, "Unable to provision the client.", 500);
  }
}
