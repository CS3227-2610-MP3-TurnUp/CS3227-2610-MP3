import { publicationResource } from "../../../../../../server/student-assistant/publication-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ eventId: string }> }) {
  return publicationResource(request, (await context.params).eventId);
}
