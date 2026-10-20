import { handleCredentials } from "../../../../server/accounts/service";
export const runtime = "nodejs";
export async function POST(request: Request) { return handleCredentials(request); }
