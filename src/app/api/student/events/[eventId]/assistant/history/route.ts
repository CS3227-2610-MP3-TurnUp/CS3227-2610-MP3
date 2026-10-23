import { historyResource } from "../../../../../../../server/student-assistant/history-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ eventId: string }> }) {
  return historyResource(request, (await context.params).eventId, "hosted");
}
