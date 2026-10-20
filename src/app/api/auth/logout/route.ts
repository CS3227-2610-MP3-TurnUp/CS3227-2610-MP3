import { handleAuth } from "../../../../server/auth/service";

export const runtime = "nodejs";
export async function POST(request: Request) { return handleAuth(request, "logout"); }
