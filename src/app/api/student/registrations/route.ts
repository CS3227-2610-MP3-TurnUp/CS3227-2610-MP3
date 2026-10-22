import { registrationResource } from "../../../../server/registration/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return registrationResource(request, "list");
}
