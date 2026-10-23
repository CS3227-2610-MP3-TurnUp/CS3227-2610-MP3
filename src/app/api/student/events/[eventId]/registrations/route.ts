import { registrationResource } from "../../../../../../server/registration/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await context.params;
  return registrationResource(request, "join", eventId);
}
export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await context.params;
  return registrationResource(request, "join", eventId);
}
