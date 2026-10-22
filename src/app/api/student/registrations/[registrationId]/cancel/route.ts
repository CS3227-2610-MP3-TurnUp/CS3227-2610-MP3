import { registrationResource } from "../../../../../../server/registration/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ registrationId: string }> }) {
  const { registrationId } = await context.params;
  return registrationResource(request, "cancel", registrationId);
}
