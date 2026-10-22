import { hostedResource } from "../../../../../../../server/student-assistant/hosted-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ eventId: string }> }) {
  return hostedResource(request, (await context.params).eventId, "source");
}
