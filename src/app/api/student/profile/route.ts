import { handleProfile } from "../../../../server/accounts/profile";
export const runtime = "nodejs";
export async function GET(request: Request) { return handleProfile(request); }
export async function POST(request: Request) { return handleProfile(request); }
