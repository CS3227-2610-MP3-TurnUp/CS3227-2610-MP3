import { studentEventResource } from "../../../../../server/registration/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ eventId: string }> }) {
  return studentEventResource(request, (await context.params).eventId);
}
